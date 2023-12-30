import "reflect-metadata";
import bodyParser from "body-parser";
import express, { Express, Router } from "express";
import { globSync } from "glob";
import path from "path";
import {
    ClassMetadata,
    CtxMetadata,
    ParamMetadata,
    RouteClassMetadata,
    RouteMetadata,
} from "@/core/decorators/routeDecorator";
import { corsMiddleware } from "@/core/middlewares/corsMiddleware";
import {
    KEY_INJECTABLE,
    KEY_NONE_AUTH,
    KEY_ROUTE_BODY,
    KEY_ROUTE_CLASS,
    KEY_ROUTE_CTX,
    KEY_ROUTE_HEADERS,
    KEY_ROUTE_PARAMS,
    KEY_ROUTE_PATH,
    KEY_ROUTE_QUERY,
    KEY_ROUTE_STATUS_CODE,
    KEY_USER_TOKEN,
} from "@/core/constants";
import { errorMiddleware } from "@/core/middlewares/errorMiddleware";
import { globalConfig } from "@/core/components/config";
import { logger } from "@/core/components/logger";
import { DS } from "@/core/components/dataSource";
import { CacheClient } from "@/core/components/cacheClient";
import { Commons, Objects } from "@/core/utils";
import { Context, Next, Req, Res } from "@/core/types";
import {
    ObjectInitializationError,
    RouteInitializationError,
    ServiceError,
} from "@/core/errors";
import { Jwt } from "@/core/components/jwt";

const engine: Express = express();
const classMetadataContainer: Map<string, ClassMetadata> = new Map();
const instantiatedSingletonObjects: Map<string, any> = new Map();
const initializedSingletonObjects: Map<string, any> = new Map();

export const Application = {
    async run() {
        await registerLifecycleEvents();

        engine.use(corsMiddleware);
        engine.use(bodyParser.json());

        initializeInjectableObjects();
        await initializeRoutes();

        engine.use(errorMiddleware);

        engine.listen(globalConfig.port, () => {
            logger.info(`Server started on ${globalConfig.port} (*￣︶￣).`);
        });
    },
};

async function registerLifecycleEvents() {
    await onReady();

    process.on("SIGINT", async () => {
        await onClose();
        process.exit(0);
    });
    process.on("SIGTERM", async () => {
        await onClose();
        process.exit(0);
    });
}

/**
 * Lifecycle function, do something before engine started.
 */
async function onReady() {
    try {
        // to initialize the initial connection with the database, register all entities
        // and "synchronize" database schema, call "initialize()" method of a newly created database
        // once in your application bootstrap
        await DS.initialize();
        logger.info("Data Source initialized.");
    } catch (err) {
        throw new Error(
            `Failed when executing lifecycle event "onReady". ${err}.`,
        );
    }
}

/**
 * Lifecycle function, do something before engine shutdown.
 */
async function onClose() {
    try {
        await DS.destroy();
        logger.info("Data Source destroyed.");

        await CacheClient.quit();
        logger.info("Cache client closed.");
    } catch (err) {
        throw new Error(
            `Failed when executing lifecycle event "onClose". ${err}.`,
        );
    }
}

async function initializeRoutes() {
    for (const classMetadata of classMetadataContainer.values()) {
        const router = Router();

        for (const [
            methodName,
            methodArgs,
        ] of classMetadata.methodArgsMetadata) {
            const routeMetadata: RouteMetadata | undefined =
                Reflect.getMetadata(
                    KEY_ROUTE_PATH,
                    classMetadata.clazz.prototype,
                    methodName,
                );

            // Maybe some methods is not used for route
            if (routeMetadata === undefined) {
                continue;
            }

            router[routeMetadata.method](
                routeMetadata.path,
                ...routeMetadata.middlewares,
                await buildExpressRouteHandler(
                    classMetadata,
                    methodName,
                    methodArgs,
                ),
            );

            const routeClassMetadata: RouteClassMetadata | undefined =
                Reflect.getMetadata(KEY_ROUTE_CLASS, classMetadata.clazz);
            if (routeClassMetadata === undefined) {
                throw new RouteInitializationError(
                    `Rout class metadata is undefined.`,
                );
            }

            engine.use(routeClassMetadata.routePrefix, router);

            logger.debug(
                `Bind route: ${
                    classMetadata.clazz.name
                }::${methodName} => ${routeMetadata.method.toUpperCase()} ${
                    routeClassMetadata.routePrefix + routeMetadata.path
                }.`,
            );
        }
    }
}

function initializeInjectableObjects() {
    scanInjectableClassesMetadata();
    logger.debug(`Scan injectable classes metadata completed.`);

    Array.from(classMetadataContainer.values()).forEach(classMetadata => {
        createObjectInstance(classMetadata);
    });
    logger.debug(`Initialize injectable objects completed.`);
}

function scanInjectableClassesMetadata() {
    const { baseDir, ext } = Commons.getEnvBaseDirAndExt();
    const files = globSync(`${baseDir}/**/*.${ext}`);
    const fileObjects = files.map(it => require(path.resolve(it)));

    fileObjects.forEach(fileObject => {
        Object.values(fileObject).forEach((target: any) => {
            if (!isInjectableClass(target)) {
                return;
            }

            const classMetadata: ClassMetadata = {
                clazz: target,
                constructorParamTypesMetadata: [],
                methodArgsMetadata: new Map(),
            };

            const constructorParamTypes: any[] =
                Reflect.getMetadata("design:paramtypes", target) ?? [];
            for (const paramType of constructorParamTypes) {
                // TODO: Maybe there has a circular dependency, now ignore this case
                if (paramType !== undefined) {
                    classMetadata.constructorParamTypesMetadata.push(paramType);
                }
            }

            Object.getOwnPropertyNames(target.prototype)
                .filter(it => it !== "constructor")
                .forEach(methodName => {
                    classMetadata.methodArgsMetadata.set(methodName, []);
                });

            classMetadataContainer.set(target.name, classMetadata);
        });
    });
}

function createObjectInstance(classMetadata: ClassMetadata) {
    if (!isInjectableClass(classMetadata.clazz)) {
        throw new ObjectInitializationError(
            `Class "${classMetadata.clazz.name}" is not injectable.`,
        );
    }

    const instance = new classMetadata.clazz();
    instantiatedSingletonObjects.set(classMetadata.clazz.name, instance);

    populateProperties(instance, classMetadata);

    initializedSingletonObjects.set(classMetadata.clazz.name, instance);
    instantiatedSingletonObjects.delete(classMetadata.clazz.name);
}

function populateProperties(instance: any, classMetadata: ClassMetadata) {
    if (classMetadata.constructorParamTypesMetadata === undefined) {
        return;
    }

    const instanceParamNames = Reflect.ownKeys(instance);
    for (
        let i = 0;
        i < classMetadata.constructorParamTypesMetadata.length;
        i++
    ) {
        const propertyClass = classMetadata.constructorParamTypesMetadata[i];
        const propertyName = instanceParamNames[i];

        if (instance[propertyName] === undefined) {
            const propertyInstance = getObjectInstance(propertyClass.name);
            if (propertyInstance === undefined) {
                const propertyClassMetadata = classMetadataContainer.get(
                    propertyClass.name,
                );

                // Maybe some params not need to inject
                if (propertyClassMetadata === undefined) {
                    continue;
                }
                createObjectInstance(propertyClassMetadata);
            } else {
                instance[propertyName] = propertyInstance;
            }
        }
    }
}

function getObjectInstance(className: string) {
    let instance: any;
    instance = initializedSingletonObjects.get(className);
    if (instance !== undefined) {
        return instance;
    }

    instance = instantiatedSingletonObjects.get(className);
    if (instance !== undefined) {
        return instance;
    }

    return undefined;
}

function isInjectableClass(target: any) {
    if (!Objects.isObject(target)) {
        return false;
    }

    return Reflect.getMetadata(KEY_INJECTABLE, target) !== undefined;
}

async function buildExpressRouteHandler(
    classMetadata: ClassMetadata,
    methodName: string,
    methodArgs: string[],
) {
    return async (req: Req, res: Res, next: Next) => {
        const requestId = generateRequestId();
        try {
            // Check authorization
            const userId = await checkAuthorization(
                req,
                classMetadata,
                methodName,
            );

            // Assign method args
            const map = new Map<string, string>();
            map.set(KEY_ROUTE_QUERY, "query");
            map.set(KEY_ROUTE_PARAMS, "params");
            map.set(KEY_ROUTE_HEADERS, "headers");
            map.set(KEY_ROUTE_BODY, "body");

            for (const [routeKey, routerValue] of map) {
                const paramMetadata: ParamMetadata[] =
                    Reflect.getMetadata(
                        routeKey,
                        classMetadata.clazz.prototype,
                        methodName,
                    ) ?? [];
                paramMetadata.forEach(it => {
                    if (it.paramName) {
                        methodArgs[it.paramIndex] = (req as any)[routerValue][
                            it.paramName
                        ];
                    } else {
                        methodArgs[it.paramIndex] = (req as any)[routerValue];
                    }
                });
            }

            // Assign context
            assignContext(
                req,
                res,
                classMetadata,
                methodName,
                methodArgs,
                userId,
                requestId,
            );

            // Get singleton
            const instance = initializedSingletonObjects.get(
                classMetadata.clazz.name,
            );

            // Execute handler method
            const result = await instance[methodName](
                ...classMetadata.methodArgsMetadata.get(methodName)!,
            );

            // Assign status code
            assignStatusCode(res, classMetadata, methodName);

            return res.send(result);
        } catch (err: any) {
            err.requestId = requestId;
            next(err);
        }
    };
}

async function checkAuthorization(
    req: Req,
    classMetadata: ClassMetadata,
    methodName: string,
) {
    const nonAuth: boolean =
        Reflect.getMetadata(
            KEY_NONE_AUTH,
            classMetadata.clazz.prototype,
            methodName,
        ) ?? false;
    if (nonAuth) {
        return;
    }

    const authorization = req.headers.authorization;
    if (!authorization) {
        throw new ServiceError(`header "authorization" is not found.`);
    }

    // Check from cache and validate token
    const token = authorization.replace("Bearer ", "");
    if (!token) {
        throw new ServiceError(`Authorization token is not found.`);
    }
    const payload = Jwt.parse(token);

    if (payload === null) {
        throw new ServiceError(`Parsed payload is null.`);
    }
    if (typeof payload === "string" || !payload.userId) {
        throw new ServiceError(
            `Cannot parse \`userId\` from payload. payload: ${JSON.stringify(
                payload,
            )}`,
        );
    }

    const userId = payload.userId;
    const userToken = await CacheClient.get(
        Commons.generateCacheKey(KEY_USER_TOKEN, userId!),
    );
    if (!userToken) {
        throw new ServiceError(`Please login first.`);
    }

    Jwt.verify(token);

    return userId;
}

function assignContext(
    req: Req,
    res: Res,
    classMetadata: ClassMetadata,
    methodName: string,
    methodArgs: string[],
    userId: string | undefined,
    requestId: string,
) {
    const ctxMetadata: CtxMetadata | undefined = Reflect.getMetadata(
        KEY_ROUTE_CTX,
        classMetadata.clazz.prototype,
        methodName,
    );
    if (ctxMetadata === undefined) {
        return;
    }

    const ctx: Context = {
        req,
        res,
        query: req.query,
        params: req.params,
        headers: req.headers,
        body: req.body,
        requestId,
        userId,
    };
    methodArgs[ctxMetadata.paramIdx] = ctxMetadata.source
        ? ctx[ctxMetadata.source]
        : ctx;
}

function assignStatusCode(
    res: Res,
    classMetadata: ClassMetadata,
    methodName: string,
) {
    res.statusCode =
        Reflect.getMetadata(
            KEY_ROUTE_STATUS_CODE,
            classMetadata.clazz.prototype,
            methodName,
        ) ?? 200;
}

function generateRequestId(length: number = 7): string {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
