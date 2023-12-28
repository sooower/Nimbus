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
import { ServiceError } from "@/core/errors";
import { Jwt } from "@/core/components/jwt";

const engine: Express = express();

const classMetadataContainer: Map<string, ClassMetadata> = new Map();

const singletonObjects: Map<string, any> = new Map();

export const Application = {
    async run() {
        await registerLifecycleEvents();

        engine.use(corsMiddleware);
        engine.use(bodyParser.json());

        scanClassesMetadata([KEY_ROUTE_CLASS]);
        await initRoutes();

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

async function initRoutes() {
    for (const classMetadata of classMetadataContainer.values()) {
        const router = Router();

        for (const [methodName, methodArgs] of classMetadata.methodMetadata) {
            const routeMetadata: RouteMetadata = Reflect.getMetadata(
                KEY_ROUTE_PATH,
                classMetadata.classPrototype,
                methodName,
            );

            // Maybe some methods is not used for route
            if (!routeMetadata) {
                return;
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

            const routeClassMetadata: RouteClassMetadata = Reflect.getMetadata(
                KEY_ROUTE_CLASS,
                classMetadata.clazz,
            );
            engine.use(routeClassMetadata.routePrefix, router);

            logger.debug(
                `Bind route: ${
                    classMetadata.clazz.name
                }::${methodName} => ${routeMetadata.method.toUpperCase()} ${
                    routeClassMetadata.routePrefix + routeMetadata.path
                }`,
            );
        }
    }
}

function scanClassesMetadata(metadataKeys: string[]) {
    const { baseDir, ext } = Commons.getEnvBaseDirAndExt();
    const files = globSync(`${baseDir}/**/*.${ext}`);
    const fileObjects = files.map(it => require(path.resolve(it)));

    fileObjects.forEach(fileObject => {
        Object.values(fileObject).forEach((x: any) => {
            if (!isLegalClass(metadataKeys, x)) {
                return;
            }

            const classMetadata: ClassMetadata = {
                clazz: x,
                classPrototype: x.prototype,
                methodMetadata: new Map(),
            };

            const methodNames = Object.getOwnPropertyNames(x.prototype).filter(
                it => it !== "constructor",
            );
            methodNames.forEach(methodName => {
                classMetadata.methodMetadata.set(methodName, []);
            });

            classMetadataContainer.set(x.name, classMetadata);
        });
    });
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
                const paramMetadata: ParamMetadata[] = Reflect.getMetadata(
                    routeKey,
                    classMetadata.classPrototype,
                    methodName,
                );
                (paramMetadata ?? []).forEach(it => {
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
            const instance = getSingleton(classMetadata.clazz);

            // Execute handler method
            const result = await instance[methodName](
                ...classMetadata.methodMetadata.get(methodName)!,
            );

            // Assign status code
            assignStatusCode(res, classMetadata, methodName);

            return res.send(result);
        } catch (err: any) {
            next(
                new ServiceError(err.message, err.status, err.stack, requestId),
            );
        }
    };
}

async function checkAuthorization(
    req: Req,
    classMetadata: ClassMetadata,
    methodName: string,
) {
    const nonAuth: boolean = Reflect.getMetadata(
        KEY_NONE_AUTH,
        classMetadata.classPrototype,
        methodName,
    );
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
    const ctxMetadata: CtxMetadata = Reflect.getMetadata(
        KEY_ROUTE_CTX,
        classMetadata.classPrototype,
        methodName,
    );
    if (ctxMetadata) {
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
}

function assignStatusCode(
    res: Res,
    classMetadata: ClassMetadata,
    methodName: string,
) {
    const status = Reflect.getMetadata(
        KEY_ROUTE_STATUS_CODE,
        classMetadata.classPrototype,
        methodName,
    );
    if (status) {
        res.statusCode = status;
    }
}

function getSingleton(clazz: any) {
    if (!singletonObjects.has(clazz.name)) {
        singletonObjects.set(clazz.name, new clazz());
    }
    return singletonObjects.get(clazz.name);
}

function generateRequestId(length: number = 7): string {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function isLegalClass(metadataKeys: string[], target: any) {
    if (!Objects.isObject(target)) {
        return false;
    }

    for (const metadataKey of metadataKeys) {
        if (!Objects.isUndefined(Reflect.getMetadata(metadataKey, target))) {
            return true;
        }
    }

    return false;
}
