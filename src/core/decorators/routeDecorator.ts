import { Router } from "express";

import {
    KEY_ROUTER_BODY,
    KEY_ROUTER_CTX,
    KEY_ROUTER_HANDLER,
    KEY_ROUTER_HEADERS,
    KEY_ROUTER_PARAMS,
    KEY_ROUTER_PREFIX,
    KEY_ROUTER_QUERY,
    KEY_ROUTER_STATUS_CODE,
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
            generateMetadataKey(KEY_ROUTER_STATUS_CODE, propertyKey),
            code,
            target,
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
            generateMetadataKey(KEY_ROUTER_CTX, propertyKey),
            ctxMetadataValue,
            target,
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

            // Get method
            router[method](
                routePath,
                ...middlewares,
                async (req: Req, res: Res, next: Next) => {
                    try {
                        const map = new Map<string, string>();
                        map.set(KEY_ROUTER_QUERY, "query");
                        map.set(KEY_ROUTER_PARAMS, "params");
                        map.set(KEY_ROUTER_HEADERS, "headers");
                        map.set(KEY_ROUTER_BODY, "body");

                        // Assign request parameters, include: "query", "params", "headers" and "body"
                        const methodArgs: any[] = [];
                        for (const [routeKey, routerValue] of map) {
                            const metadataKey = generateMetadataKey(
                                routeKey,
                                propertyKey,
                            );
                            const metadataValue: ParamMetadataValue[] =
                                Reflect.getMetadata(metadataKey, target);
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

                        const requestId = genRequestId();

                        // Assign context
                        const ctxMetadataValue: CtxMetadataValue =
                            Reflect.getMetadata(
                                generateMetadataKey(
                                    KEY_ROUTER_CTX,
                                    propertyKey,
                                ),
                                target,
                            );
                        if (ctxMetadataValue) {
                            const context: Context = {
                                req,
                                res,
                                query: req.query,
                                params: req.params,
                                headers: req.headers,
                                body: req.body,
                                requestId,
                            };
                            methodArgs[ctxMetadataValue.paramIdx] =
                                ctxMetadataValue.source
                                    ? context[ctxMetadataValue.source]
                                    : context;
                        }

                        // Execute handler method
                        let result: any;
                        try {
                            result = await propertyDescriptor.value(
                                ...methodArgs,
                            );
                        } catch (err: any) {
                            throw new ServiceError(
                                err.message,
                                err.status ?? 400,
                                err.stack,
                                requestId,
                            );
                        }

                        // Assign status code
                        const status = Reflect.getMetadata(
                            generateMetadataKey(
                                KEY_ROUTER_STATUS_CODE,
                                propertyKey,
                            ),
                            target,
                        );
                        if (status) {
                            res.statusCode = status;
                        }

                        return res.send(result);
                    } catch (err) {
                        next(err);
                    }
                },
            );

            Reflect.defineMetadata(KEY_ROUTER_HANDLER, router, target);
        };
    };
}

function createRouteParamsDecorator(paramType: string) {
    return function (paramName?: string, parseFunc?: Function) {
        return function (
            target: object,
            propertyKey: string,
            paramIdx: number,
        ) {
            const metadataKey = generateMetadataKey(paramType, propertyKey);
            const metadataValue: ParamMetadataValue = { paramIdx, paramName };
            if (!Reflect.hasMetadata(metadataKey, target)) {
                Reflect.defineMetadata(metadataKey, [metadataValue], target);
            } else {
                const originMetadataValue: any[] = Reflect.getMetadata(
                    metadataKey,
                    target,
                );
                originMetadataValue.push(metadataValue);
                Reflect.defineMetadata(
                    metadataKey,
                    originMetadataValue,
                    target,
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

function generateMetadataKey(...keys: string[]) {
    return keys.join(":");
}

function genRequestId(length: number = 7): string {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
