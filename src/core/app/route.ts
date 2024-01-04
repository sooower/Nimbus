import { ObjectsFactory } from "@/core/app/objectsFactory";
import { Express, Router } from "express";
import {
    ClassMetadata,
    CtxMetadata,
    ParamMetadata,
    RouteClassMetadata,
    RouteMetadata,
} from "@/core/decorators/routeDecorator";
import {
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
import { AuthenticationError, AuthorizationError, RouteInitializationError } from "@/core/errors";
import { logger } from "@/core/components/logger";
import { Context, Next, Req, Res } from "@/core/types";
import { Jwt } from "@/core/components/jwt";
import { CacheClient } from "@/core/components/cacheClient";
import { Commons } from "@/core/utils/commons";
import { DS } from "@/core/components/dataSource";
import { Role } from "@/entities/accounts/role";
import { Permission } from "@/entities/accounts/permission";

export class Route {
    constructor(
        private objectsFactory: ObjectsFactory,
        private engine: Express,
    ) {}

    async initialize() {
        for (const classMetadata of this.objectsFactory.getClassMetadataContainer().values()) {
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
                    throw new RouteInitializationError(
                        `Route class metadata is undefined. class: "${classMetadata.clazz}"`,
                    );
                }

                router[routeMetadata.method](
                    routeMetadata.path,
                    ...routeMetadata.middlewares,
                    await this.initializeHandler(classMetadata, methodName, methodArgs),
                );

                this.engine.use(routeClassMetadata.routePrefix, router);

                logger.debug(
                    `${
                        classMetadata.clazz.name
                    }::${methodName} ${routeMetadata.method.toUpperCase()} ${
                        routeClassMetadata.routePrefix + routeMetadata.path
                    }.`,
                );
            }
        }
    }

    private async initializeHandler(
        classMetadata: ClassMetadata,
        methodName: string,
        methodArgs: string[],
    ) {
        return async (req: Req, res: Res, next: Next) => {
            const requestId = Commons.generateRequestId();
            try {
                const start = Date.now();

                // Check for authorization
                const userId = await this.checkForAuthorization(req, classMetadata, methodName);

                // Check for authentication
                if (userId !== undefined) {
                    await this.checkForAuthentication(classMetadata, methodName, userId);
                }

                // Assign method args
                const map = new Map<string, string>();
                map.set(KEY_ROUTE_QUERY, "query");
                map.set(KEY_ROUTE_PARAMS, "params");
                map.set(KEY_ROUTE_HEADERS, "headers");
                map.set(KEY_ROUTE_BODY, "body");

                for (const [routeKey, routeValue] of map) {
                    (
                        Reflect.getMetadata(routeKey, classMetadata.clazz.prototype, methodName) ??
                        []
                    ).forEach((paramMetadata: ParamMetadata) => {
                        methodArgs[paramMetadata.methodParamIndex] =
                            paramMetadata.routeParamName !== undefined
                                ? (req as any)[routeValue][paramMetadata.routeParamName]
                                : (req as any)[routeValue];
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
                const instance = this.objectsFactory
                    .getSingletonObjects()
                    .get(classMetadata.clazz.name);

                // Execute handler method
                const result = await instance[methodName](
                    ...classMetadata.methodArgsMetadata.get(methodName)!,
                );

                // Assign status code
                this.assignStatusCode(res, classMetadata, methodName);

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

    private async checkForAuthorization(
        req: Req,
        classMetadata: ClassMetadata,
        methodName: string,
    ) {
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

    private async checkForAuthentication(
        classMetadata: ClassMetadata,
        key: string,
        userId: string,
    ) {
        const permissions: string[] =
            Reflect.getMetadata(KEY_PERMISSION, classMetadata.clazz.prototype, key) ?? [];
        if (permissions.length === 0) {
            return;
        }

        // Do not check for permission if role is admin
        const roleRecords = await DS.getRepository(Role)
            .createQueryBuilder("role")
            .innerJoin("role.users", "user")
            .where("user.id = :userId", { userId })
            .select("role.name")
            .getMany();

        const roles = roleRecords.map(it => it.name);
        if (roles.includes("ADMIN")) {
            return;
        }

        // Check for permissions
        const permissionRecords = await DS.getRepository(Permission)
            .createQueryBuilder("permission")
            .innerJoin("permission.roles", "role")
            .innerJoin("role.users", "user")
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

    private assignContext(
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

    private assignStatusCode(res: Res, classMetadata: ClassMetadata, methodName: string) {
        res.statusCode =
            Reflect.getMetadata(KEY_ROUTE_STATUS_CODE, classMetadata.clazz.prototype, methodName) ??
            200;
    }
}
