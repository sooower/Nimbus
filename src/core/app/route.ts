import { validate } from "class-validator";
import { Express, Router } from "express";

import { Permission } from "@/entities/accounts/permission";
import { Role } from "@/entities/accounts/role";

import { CacheClient } from "../components/cacheClient";
import { DS } from "../components/dataSource";
import { Jwt } from "../components/jwt";
import { logger } from "../components/logger";
import {
    KEY_NONE_AUTH,
    KEY_PARSE_ARRAY_TYPE,
    KEY_PARSE_TYPE,
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
} from "../constants";
import { PropertyArrayMetadata, PropertyMetadata } from "../decorators/parseDecorator";
import {
    ClassMetadata,
    CtxMetadata,
    ParamMetadata,
    RouteClassMetadata,
    RouteMetadata,
} from "../decorators/routeDecorator";
import {
    AuthenticationError,
    AuthorizationError,
    RouteInitializationError,
    ValidationError,
} from "../errors";
import { Context, Next, Req, Res } from "../types";
import { Commons } from "../utils/commons";
import { ObjectsFactory } from "./objectsFactory";

export class Route {
    private routeParams: Map<string, string> = new Map();

    constructor(
        private objectsFactory: ObjectsFactory,
        private engine: Express,
    ) {
        this.routeParams.set(KEY_ROUTE_QUERY, "query");
        this.routeParams.set(KEY_ROUTE_PARAMS, "params");
        this.routeParams.set(KEY_ROUTE_HEADERS, "headers");
        this.routeParams.set(KEY_ROUTE_BODY, "body");
    }

    async initialize() {
        for (const classMetadata of this.objectsFactory.getClassMetadataContainer().values()) {
            const router = Router();

            for (const [methodName, methodArgs] of classMetadata.methodArgsMetadata) {
                const routeMetadata: RouteMetadata | undefined = Reflect.getMetadata(
                    KEY_ROUTE_PATH,
                    classMetadata.clazz,
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
                        `Route class "${classMetadata.clazz}" metadata is undefined.`,
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

        logger.info(`Route initialized.`);
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
                for (const [routeKey, routeParamKey] of this.routeParams) {
                    const paramsMetadata: ParamMetadata[] =
                        Reflect.getMetadata(routeKey, classMetadata.clazz, methodName) ?? [];

                    for (const paramMetadata of paramsMetadata) {
                        const routeParamValue =
                            paramMetadata.routeParamName !== undefined
                                ? (req as any)[routeParamKey][paramMetadata.routeParamName]
                                : (req as any)[routeParamKey];

                        const instance = await this.transferRouteParamToInstance(
                            paramMetadata.methodParamType,
                            routeParamValue,
                        );

                        // Validate the class instance
                        const errors = await validate(instance);
                        if (errors.length > 0) {
                            throw new ValidationError(
                                errors
                                    .flatMap(err =>
                                        err.constraints ? Object.values(err.constraints) : [],
                                    )
                                    .join("; "),
                            );
                        }

                        methodArgs[paramMetadata.methodParamIndex] = instance;
                    }
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
                logger.info(
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
            Reflect.getMetadata(KEY_NONE_AUTH, classMetadata.clazz, methodName) ?? false;
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
            Reflect.getMetadata(KEY_PERMISSION, classMetadata.clazz, key) ?? [];
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

    private transferPlainToInstance(clazz: new () => any, obj: any) {
        const instance = new clazz();

        Object.keys(obj).forEach(key => {
            // If property type is array, instantiate element class of the array at first
            const propertiesArrayMetadata: PropertyArrayMetadata[] =
                Reflect.getMetadata(KEY_PARSE_ARRAY_TYPE, clazz) ?? [];
            for (const propertyArrayMetadata of propertiesArrayMetadata) {
                if (propertyArrayMetadata.name === key) {
                    instance[key] = obj[key].map((it: any) =>
                        this.transferPlainToInstance(propertyArrayMetadata.clazz, it),
                    );
                    return;
                }
            }

            // Assign property directly
            instance[key] = obj[key];
        });

        return instance;
    }

    private async transferRouteParamToInstance(
        methodParamType: new () => any,
        routeParamValue: any,
    ) {
        const instance = this.transferPlainToInstance(methodParamType, routeParamValue);

        // Transfer properties types if the class has properties transform metadata
        const propertiesMetadata: PropertyMetadata[] =
            Reflect.getMetadata(KEY_PARSE_TYPE, methodParamType) ?? [];
        propertiesMetadata.forEach(propertyMetadata => {
            const propertyName = propertyMetadata.name;
            const propertyValue = instance[propertyName];
            const propertyTypeName = propertyMetadata.clazz.name;

            // Ignore the property which is not defined in property class
            if (instance[propertyName] === undefined) {
                return;
            }

            switch (propertyTypeName) {
                case "Number": {
                    if (!/^[-+]?[0-9]+(\.[0-9]*)?$/.test(propertyValue)) {
                        throw new ValidationError(`\`${propertyName}\` must be a number value.`);
                    }

                    instance[propertyName] = Number(instance[propertyName]);
                    break;
                }
                case "Boolean": {
                    if (!/^(true|false)$/.test(propertyValue)) {
                        throw new ValidationError(`\`${propertyName}\` must be a boolean value.`);
                    }

                    instance[propertyName] = instance[propertyName] === "true";
                    break;
                }
                default: {
                    throw new ValidationError(`Not supported property type "${propertyTypeName}".`);
                }
            }
        });

        return instance;
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
            classMetadata.clazz,
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
            Reflect.getMetadata(KEY_ROUTE_STATUS_CODE, classMetadata.clazz, methodName) ?? 200;
    }
}
