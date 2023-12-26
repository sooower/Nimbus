import "reflect-metadata";

import bodyParser from "body-parser";
import express, { Express, Router } from "express";
import { globSync } from "glob";
import path from "path";

import { ds } from "@/core/components/dataSource";
import { Jwt } from "@/core/components/jwt";
import {
    ClassMetadata,
    CtxMetadata,
    ParamMetadata,
    RouteClassMetadata,
    RouteMetadata,
} from "@/core/decorators/routeDecorator";
import { ServiceError } from "@/core/errors";
import { Context, Next, Req, Res } from "@/core/types";

import { CacheClient, cacheClient } from "./components/cacheClient";
import { globalConfig } from "./components/config";
import { logger } from "./components/logger";
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
} from "./constants";
import { corsMiddleware } from "./middlewares/corsMiddleware";
import { errorMiddleware } from "./middlewares/errorMiddleware";
import {
    generateCacheKey,
    getEnvBaseDirAndExt,
    isObject,
    isUndefined,
} from "./utils";

export class App {
    /**
     * App engine, now is only support `Express`.
     * @private
     */
    private readonly engine: Express;

    /**
     * Used for collect classes metadata.
     * @private
     */
    private classMetadataMap: Map<string, ClassMetadata>;

    /**
     * Used for singleton container.
     * @private
     */
    private instanceMap: Map<string, any>;

    constructor() {
        this.engine = express();
        this.classMetadataMap = new Map();
        this.instanceMap = new Map();
    }

    /**
     * Running engine.
     */
    async run() {
        await this.registerLifecycleEvents();

        this.engine.use(corsMiddleware);

        this.engine.use(bodyParser.json());

        this.scanClassesMetadata([KEY_ROUTE_CLASS]);

        await this.initRoutes();

        this.engine.use(errorMiddleware);

        this.engine.listen(globalConfig.port, () => {
            logger.info(`Server started on ${globalConfig.port} (*￣︶￣).`);
        });
    }

    private async registerLifecycleEvents() {
        await this.onReady();

        process.on("SIGINT", async () => {
            await this.onClose();
            process.exit(0);
        });
        process.on("SIGTERM", async () => {
            await this.onClose();
            process.exit(0);
        });
    }

    /**
     * Lifecycle function, do something before engine started.
     */
    private async onReady() {
        try {
            // to initialize the initial connection with the database, register all entities
            // and "synchronize" database schema, call "initialize()" method of a newly created database
            // once in your application bootstrap
            await ds.initialize();
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
    private async onClose() {
        try {
            await ds.destroy();
            logger.info("Data Source destroyed.");

            await cacheClient.quit();
            logger.info("Cache client closed.");
        } catch (err) {
            throw new Error(
                `Failed when executing lifecycle event "onClose". ${err}.`,
            );
        }
    }

    /**
     * Scan files and initialize routes.
     */
    private async initRoutes() {
        for (const classMetadata of this.classMetadataMap.values()) {
            const router = Router();

            for (const [
                methodName,
                methodArgs,
            ] of classMetadata.methodMetadata) {
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
                    await this.buildExpressRouteHandler(
                        classMetadata,
                        methodName,
                        methodArgs,
                    ),
                );

                const routeClassMetadata: RouteClassMetadata =
                    Reflect.getMetadata(KEY_ROUTE_CLASS, classMetadata.clazz);
                this.engine.use(routeClassMetadata.routePrefix, router);

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

    private scanClassesMetadata(metadataKeys: string[]) {
        const { baseDir, ext } = getEnvBaseDirAndExt();
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

                const methodNames = Object.getOwnPropertyNames(
                    x.prototype,
                ).filter(it => it !== "constructor");
                methodNames.forEach(methodName => {
                    classMetadata.methodMetadata.set(methodName, []);
                });

                this.classMetadataMap.set(x.name, classMetadata);
            });
        });
    }

    private async buildExpressRouteHandler(
        classMetadata: ClassMetadata,
        methodName: string,
        methodArgs: string[],
    ) {
        return async (req: Req, res: Res, next: Next) => {
            const requestId = generateRequestId();
            try {
                // Check authorization
                const userId = await this.checkAuthorization(
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
                            methodArgs[it.paramIndex] = (req as any)[
                                routerValue
                            ][it.paramName];
                        } else {
                            methodArgs[it.paramIndex] = (req as any)[
                                routerValue
                            ];
                        }
                    });
                }

                // Assign context
                this.assignContext(
                    req,
                    res,
                    classMetadata,
                    methodName,
                    methodArgs,
                    userId,
                    requestId,
                );

                // Get singleton
                const instance = this.getSingleton(classMetadata.clazz);

                // Execute handler method
                const result = await instance[methodName](
                    ...classMetadata.methodMetadata.get(methodName)!,
                );

                // Assign status code
                this.assignStatusCode(res, classMetadata, methodName);

                return res.send(result);
            } catch (err: any) {
                next(
                    new ServiceError(
                        err.message,
                        err.status ?? 400,
                        err.stack,
                        requestId,
                    ),
                );
            }
        };
    }

    private async checkAuthorization(
        req: Req,
        classMetadata: ClassMetadata,
        methodName: string,
    ) {
        const nonAuth: boolean = Reflect.getMetadata(
            KEY_NONE_AUTH,
            classMetadata.classPrototype,
            methodName,
        );

        let userId: string | undefined;
        if (!nonAuth) {
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

            userId = payload.userId;
            if (
                !(await CacheClient.get(
                    generateCacheKey(KEY_USER_TOKEN, userId!),
                ))
            ) {
                throw new ServiceError(`Please login first.`);
            }

            Jwt.verify(token);

            return userId;
        }
    }

    private assignContext(
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

    private assignStatusCode(
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

    private getSingleton(clazz: any) {
        if (!this.instanceMap.has(clazz.name)) {
            this.instanceMap.set(clazz.name, new clazz());
        }
        return this.instanceMap.get(clazz.name);
    }
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
    if (!isObject(target)) {
        return false;
    }

    for (const metadataKey of metadataKeys) {
        if (!isUndefined(Reflect.getMetadata(metadataKey, target))) {
            return true;
        }
    }

    return false;
}
