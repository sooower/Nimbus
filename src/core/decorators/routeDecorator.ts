import { Router } from "express";

import { CacheClient } from "@/core/components/cacheClient";
import { Jwt } from "@/core/components/jwt";
import { generateCacheKey } from "@/core/utils";

import {
    KEY_NONE_AUTH,
    KEY_ROUTER_BODY,
    KEY_ROUTER_CTX,
    KEY_ROUTER_HANDLER,
    KEY_ROUTER_HEADERS,
    KEY_ROUTER_PARAMS,
    KEY_ROUTER_PREFIX,
    KEY_ROUTER_QUERY,
    KEY_ROUTER_STATUS_CODE,
    KEY_USER_TOKEN,
} from "../constants";
import { ServiceError } from "../errors";
import { Context, MiddlewareFunc, Next, Req, Res } from "../types";

type ParamMetadataValue = {
    paramIdx: number;
    paramName?: string;
};

type CtxSource =
    | "req"
    | "res"
    | "requestId"
    | "query"
    | "params"
    | "headers"
    | "body";

type CtxMetadataValue = {
    source?: CtxSource;
    propertyKey: string;
    paramIdx: number;
};

export function Controller(prefix?: string): ClassDecorator {
    const routePrefix = prefix == "/" || !prefix ? "" : cutRoutePath(prefix);
    return function (target: any) {
        Reflect.defineMetadata(
            KEY_ROUTER_PREFIX,
            routePrefix,
            target.prototype,
        );
    };
}

export const Get = createRouteMethodDecorator("get");
export const Post = createRouteMethodDecorator("post");
export const Patch = createRouteMethodDecorator("patch");
export const Put = createRouteMethodDecorator("put");
export const Delete = createRouteMethodDecorator("delete");

export const Query = createRouteParamsDecorator(KEY_ROUTER_QUERY);
export const Param = createRouteParamsDecorator(KEY_ROUTER_PARAMS);
export const Headers = createRouteParamsDecorator(KEY_ROUTER_HEADERS);
export const Body = createRouteParamsDecorator(KEY_ROUTER_BODY);

export function StatusCode(code: number) {
    return function (target: any, propertyKey: string, _: PropertyDescriptor) {
        Reflect.defineMetadata(
            KEY_ROUTER_STATUS_CODE,
            code,
            target,
            propertyKey,
        );
    };
}

export function Ctx(source?: CtxSource) {
    return function (target: object, propertyKey: string, paramIdx: number) {
        // Collect Context metadata
        const ctxMetadataValue: CtxMetadataValue = {
            source,
            propertyKey,
            paramIdx,
        };
        Reflect.defineMetadata(
            KEY_ROUTER_CTX,
            ctxMetadataValue,
            target,
            propertyKey,
        );
    };
}

function createRouteMethodDecorator(
    method: "get" | "post" | "put" | "patch" | "delete",
) {
    return function (path?: string, ...middlewares: MiddlewareFunc[]) {
        return function (
            target: any,
            propertyKey: string,
            propertyDescriptor: PropertyDescriptor,
        ) {
            const routePath = path == "" || !path ? "/" : cutRoutePath(path);
            const router =
                Reflect.getMetadata(KEY_ROUTER_HANDLER, target) || Router();

            // Build routes
            router[method](
                routePath,
                ...middlewares,
                async (req: Req, res: Res, next: Next) => {
                    const requestId = genRequestId();
                    try {
                        // Check authorization
                        const nonAuth: boolean = Reflect.getMetadata(
                            KEY_NONE_AUTH,
                            target,
                            propertyKey,
                        );

                        let userId: string | undefined;
                        if (!nonAuth) {
                            // Check from cache and validate token
                            const token = req.headers.authorization?.replace(
                                "Bearer ",
                                "",
                            );
                            if (!token) {
                                throw new ServiceError(
                                    `Authorization token is not found.`,
                                );
                            }
                            const payload = Jwt.parse(token);

                            if (payload === null) {
                                throw new ServiceError(
                                    `Parsed payload is null.`,
                                );
                            }
                            if (
                                typeof payload === "string" ||
                                !payload.userId
                            ) {
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
                        }

                        // Assign request parameters, include: "query", "params", "headers" and "body"
                        const map = new Map<string, string>();
                        map.set(KEY_ROUTER_QUERY, "query");
                        map.set(KEY_ROUTER_PARAMS, "params");
                        map.set(KEY_ROUTER_HEADERS, "headers");
                        map.set(KEY_ROUTER_BODY, "body");

                        const methodArgs: any[] = [];
                        for (const [routeKey, routerValue] of map) {
                            const metadataValue: ParamMetadataValue[] =
                                Reflect.getMetadata(
                                    routeKey,
                                    target,
                                    propertyKey,
                                );
                            (metadataValue ?? []).forEach(it => {
                                if (it.paramName) {
                                    methodArgs[it.paramIdx] = (req as any)[
                                        routerValue
                                    ][it.paramName];
                                } else {
                                    methodArgs[it.paramIdx] = (req as any)[
                                        routerValue
                                    ];
                                }
                            });
                        }

                        // Assign context
                        const ctxMetadataValue: CtxMetadataValue =
                            Reflect.getMetadata(
                                KEY_ROUTER_CTX,
                                target,
                                propertyKey,
                            );
                        if (ctxMetadataValue) {
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
                            methodArgs[ctxMetadataValue.paramIdx] =
                                ctxMetadataValue.source
                                    ? ctx[ctxMetadataValue.source]
                                    : ctx;
                        }

                        // Execute handler method
                        const result = await propertyDescriptor.value(
                            ...methodArgs,
                        );

                        // Assign status code
                        const status = Reflect.getMetadata(
                            KEY_ROUTER_STATUS_CODE,
                            target,
                            propertyKey,
                        );
                        if (status) {
                            res.statusCode = status;
                        }

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
                },
            );

            Reflect.defineMetadata(KEY_ROUTER_HANDLER, router, target);
        };
    };
}

function createRouteParamsDecorator(paramType: string) {
    return function (paramName?: string) {
        return function (
            target: object,
            propertyKey: string,
            paramIdx: number,
        ) {
            const metadataValue: ParamMetadataValue = { paramIdx, paramName };
            if (!Reflect.hasMetadata(paramType, target, propertyKey)) {
                Reflect.defineMetadata(
                    paramType,
                    [metadataValue],
                    target,
                    propertyKey,
                );
            } else {
                const originMetadataValue: any[] = Reflect.getMetadata(
                    paramType,
                    target,
                    propertyKey,
                );
                originMetadataValue.push(metadataValue);
                Reflect.defineMetadata(
                    paramType,
                    originMetadataValue,
                    target,
                    propertyKey,
                );
            }
        };
    };
}

function cutRoutePath(str: string): string {
    if (!str.startsWith("/")) {
        str = "/" + str;
    }
    if (str.endsWith("/")) {
        str = str.slice(0, str.length - 1);
    }
    return str;
}

function genRequestId(length: number = 7): string {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
