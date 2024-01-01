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
    KEY_LAZY_INJECT,
    KEY_NONE_AUTH,
    KEY_PERMISSION,
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
    AuthenticationError,
    AuthorizationError,
    ObjectInitializationError,
    RouteInitializationError,
} from "@/core/errors";
import { Jwt } from "@/core/components/jwt";
import { ConstructorParamMetadata } from "@/core/decorators/injectionDecorator";
import { Permission } from "@/entities/accounts/permission";
import { Role } from "@/entities/accounts/role";

type LifecycleEvents = {
    /**
     * Do something before application started.
     */
    onReady: Function;

    /**
     * Do something before application shutdown.
     */
    onClose: Function;
};

export class Application {
    constructor(private lifecycleEvents: LifecycleEvents) {}

    /**
     * The bootstrap to running an application.
     */
    async run() {
        await this.registerLifecycleEvents();

        engine.use(corsMiddleware);
        engine.use(bodyParser.json());

        initializeInjectableObjects();
        await initializeRoutes();

        engine.use(errorMiddleware);

        engine.listen(globalConfig.port, () => {
            logger.info(`Server started on ${globalConfig.port} (*￣︶￣).`);
        });
    }

    async registerLifecycleEvents() {
        const { onReady, onClose } = this.lifecycleEvents;
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
}

const engine: Express = express();
const classMetadataContainer: Map<string, ClassMetadata> = new Map();
const earlySingletonObjects: Map<string, any> = new Map();
const singletonObjects: Map<string, any> = new Map();

async function initializeRoutes() {
    for (const classMetadata of classMetadataContainer.values()) {
        const router = Router();

        for (const [methodName, methodArgs] of classMetadata.methodArgsMetadata) {
            const routeMetadata: RouteMetadata | undefined = Reflect.getMetadata(
                KEY_ROUTE_PATH,
                classMetadata.clazz.prototype,
                methodName,
            );

            // Maybe some methods is not used for route
            if (routeMetadata === undefined) {
                continue;
            }

            const routeClassMetadata: RouteClassMetadata | undefined = Reflect.getMetadata(
                KEY_ROUTE_CLASS,
                classMetadata.clazz,
            );
            if (routeClassMetadata === undefined) {
                throw new RouteInitializationError(`Rout class metadata is undefined.`);
            }

            router[routeMetadata.method](
                routeMetadata.path,
                ...routeMetadata.middlewares,
                await initializeHandler(classMetadata, methodName, methodArgs),
            );

            engine.use(routeClassMetadata.routePrefix, router);

            logger.debug(
                `${classMetadata.clazz.name}::${methodName} ${routeMetadata.method.toUpperCase()} ${
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
                ctorParamClassesMetadata: [],
                methodArgsMetadata: new Map(),
            };

            const ctorParamClasses: any[] = Reflect.getMetadata("design:paramtypes", target) ?? [];
            ctorParamClasses.forEach((clazz, index) => {
                // Resolve circular dependency
                if (clazz === undefined) {
                    const ctorParamsMetadata: ConstructorParamMetadata[] =
                        Reflect.getMetadata(KEY_LAZY_INJECT, target) ?? [];

                    const fn = ctorParamsMetadata[index].instantiateFn;
                    if (fn === undefined) {
                        throw new ObjectInitializationError(
                            `Instantiate function of class "${clazz}" is not found.`,
                        );
                    }

                    clazz = fn();
                }
                classMetadata.ctorParamClassesMetadata.push(clazz);
            });

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
    earlySingletonObjects.set(classMetadata.clazz.name, instance);

    populateProperties(instance, classMetadata);

    singletonObjects.set(classMetadata.clazz.name, instance);
    earlySingletonObjects.delete(classMetadata.clazz.name);
}

function populateProperties(instance: any, classMetadata: ClassMetadata) {
    if (classMetadata.ctorParamClassesMetadata === undefined) {
        return;
    }

    const instanceParamNames = Reflect.ownKeys(instance);
    for (let i = 0; i < classMetadata.ctorParamClassesMetadata.length; i++) {
        const propertyClass = classMetadata.ctorParamClassesMetadata[i];
        const propertyName = instanceParamNames[i];

        if (instance[propertyName] === undefined) {
            if (getObjectInstance(propertyClass.name) === undefined) {
                const propertyClassMetadata = classMetadataContainer.get(propertyClass.name);

                // Maybe some params not need to inject
                if (propertyClassMetadata === undefined) {
                    continue;
                }
                createObjectInstance(propertyClassMetadata);
            }

            instance[propertyName] = getObjectInstance(propertyClass.name);
        }
    }
}

function getObjectInstance(className: string) {
    let instance: any;
    instance = singletonObjects.get(className);
    if (instance !== undefined) {
        return instance;
    }

    instance = earlySingletonObjects.get(className);
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

async function initializeHandler(
    classMetadata: ClassMetadata,
    methodName: string,
    methodArgs: string[],
) {
    return async (req: Req, res: Res, next: Next) => {
        const requestId = generateRequestId();
        try {
            const start = Date.now();

            // Check for authorization
            const userId = await checkForAuthorization(req, classMetadata, methodName);

            // Check for authentication
            if (userId !== undefined) {
                await checkForAuthentication(classMetadata, methodName, userId);
            }

            // Assign method args
            const map = new Map<string, string>();
            map.set(KEY_ROUTE_QUERY, "query");
            map.set(KEY_ROUTE_PARAMS, "params");
            map.set(KEY_ROUTE_HEADERS, "headers");
            map.set(KEY_ROUTE_BODY, "body");

            for (const [routeKey, routeValue] of map) {
                (
                    Reflect.getMetadata(routeKey, classMetadata.clazz.prototype, methodName) ?? []
                ).forEach((paramMetadata: ParamMetadata) => {
                    methodArgs[paramMetadata.methodParamIndex] =
                        paramMetadata.routeParamName !== undefined
                            ? (req as any)[routeValue][paramMetadata.routeParamName]
                            : (req as any)[routeValue];
                });
            }

            // Assign context
            assignContext(req, res, classMetadata, methodName, methodArgs, userId, requestId);

            // Get singleton
            const instance = singletonObjects.get(classMetadata.clazz.name);

            // Execute handler method
            const result = await instance[methodName](
                ...classMetadata.methodArgsMetadata.get(methodName)!,
            );

            // Assign status code
            assignStatusCode(res, classMetadata, methodName);

            const duration = Date.now() - start;
            logger.debug(
                `${req.hostname} ${duration}ms ${req.method.toUpperCase()} ${req.originalUrl}`,
            );

            return res.send(result);
        } catch (err: any) {
            err.requestId = requestId;
            next(err);
        }
    };
}

async function checkForAuthorization(req: Req, classMetadata: ClassMetadata, methodName: string) {
    const nonAuth: boolean =
        Reflect.getMetadata(KEY_NONE_AUTH, classMetadata.clazz.prototype, methodName) ?? false;
    if (nonAuth) {
        return;
    }

    const authorization = req.headers.authorization;
    if (authorization === undefined) {
        throw new AuthorizationError(` The header "authorization" is not found.`);
    }

    // Check from cache and validate token
    const token = authorization.replace("Bearer ", "");
    if (token === undefined) {
        throw new AuthorizationError(`Token is not found.`);
    }

    const payload = Jwt.parse(token);
    if (payload === null) {
        throw new AuthorizationError(`Parsed payload is null.`);
    }

    if (typeof payload === "string" || payload.userId === undefined) {
        throw new AuthorizationError(
            `Cannot parse \`userId\` from payload. payload: ${JSON.stringify(payload)}`,
        );
    }

    const userId: string = payload.userId;
    const userToken = await CacheClient.get(Commons.generateCacheKey(KEY_USER_TOKEN, userId!));
    if (userToken === null) {
        throw new AuthorizationError(`Please login first.`);
    }

    Jwt.verify(token);

    return userId;
}

async function checkForAuthentication(classMetadata: ClassMetadata, key: string, userId: string) {
    const permissions: string[] =
        Reflect.getMetadata(KEY_PERMISSION, classMetadata.clazz.prototype, key) ?? [];
    if (permissions.length === 0) {
        return;
    }

    // Do not check for permission if role.ts is admin
    const roleRecords = await DS.getRepository(Role)
        .createQueryBuilder("role")
        .innerJoin("role.ts.users", "user")
        .where("user.id = :userId", { userId })
        .select("role.ts.name")
        .getMany();

    const roles = roleRecords.map(it => it.name);
    if (roles.includes("admin")) {
        return;
    }

    // Check for permissions
    const permissionRecords = await DS.getRepository(Permission)
        .createQueryBuilder("permission")
        .innerJoin("permission.roles", "role")
        .innerJoin("role.ts.users", "user")
        .where("user.id = :userId", { userId })
        .select("permission.name")
        .getMany();

    const recordPermissions = permissionRecords.map(it => it.name);
    permissions.forEach(it => {
        if (!recordPermissions.includes(it)) {
            throw new AuthenticationError(`Permission denied.`);
        }
    });
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
    methodArgs[ctxMetadata.index] = ctxMetadata.source ? ctx[ctxMetadata.source] : ctx;
}

function assignStatusCode(res: Res, classMetadata: ClassMetadata, methodName: string) {
    res.statusCode =
        Reflect.getMetadata(KEY_ROUTE_STATUS_CODE, classMetadata.clazz.prototype, methodName) ??
        200;
}

function generateRequestId(length: number = 7): string {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}
