import { Router } from "express";

import {
    Context,
    CtxMetadataValue,
    CtxSource,
    MiddlewareFunc,
    Next,
    ParamMetadataValue,
    Req,
    Res,
} from "../types";
import {
    ROUTER_PREFIX,
    ROUTER_QUERY,
    ROUTER_PARAMS,
    ROUTER_HEADERS,
    ROUTER_BODY,
    ROUTER_STATUS_CODE,
    ROUTER_CTX,
    ROUTER_PATH,
} from "../constants";
import { cutRoutePath, genMetadataKey, genRequestId } from "../utils/common";

export function Controller(prefix?: string): ClassDecorator {
    const routePrefix = prefix == "/" || !prefix ? "" : cutRoutePath(prefix);
    return function (target: any) {
        Reflect.defineMetadata(ROUTER_PREFIX, routePrefix, target.prototype);
    };
}

export const Get = createRouteMethodDecorator("get");
export const Post = createRouteMethodDecorator("post");
export const Patch = createRouteMethodDecorator("patch");
export const Put = createRouteMethodDecorator("put");
export const Delete = createRouteMethodDecorator("delete");

export const Query = createRouteParamsDecorator(ROUTER_QUERY);
export const Params = createRouteParamsDecorator(ROUTER_PARAMS);
export const Headers = createRouteParamsDecorator(ROUTER_HEADERS);
export const Body = createRouteParamsDecorator(ROUTER_BODY);

export function StatusCode(code: number) {
    return function (target: any, propertyKey: string, _: PropertyDescriptor) {
        Reflect.defineMetadata(
            genMetadataKey(ROUTER_STATUS_CODE, propertyKey),
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
            genMetadataKey(ROUTER_CTX, propertyKey),
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
            const router = Reflect.getMetadata(ROUTER_PATH, target) || Router();

            // Get method
            router[method](
                routePath,
                ...middlewares,
                async (req: Req, res: Res, next: Next) => {
                    try {
                        const map = new Map<string, string>();
                        map.set(ROUTER_QUERY, "query");
                        map.set(ROUTER_PARAMS, "params");
                        map.set(ROUTER_HEADERS, "headers");
                        map.set(ROUTER_BODY, "body");

                        // Assign request parameters, include: "query", "params", "headers" and "body"
                        const methodArgs: any[] = [];
                        for (const [routeKey, routerValue] of map) {
                            const metadataKey = genMetadataKey(
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

                        // Assign context
                        const ctxMetadataValue: CtxMetadataValue =
                            Reflect.getMetadata(
                                genMetadataKey(ROUTER_CTX, propertyKey),
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
                                requestId: genRequestId(),
                            };
                            methodArgs[ctxMetadataValue.paramIdx] =
                                ctxMetadataValue.source
                                    ? context[ctxMetadataValue.source]
                                    : context;
                        }

                        // Execute handler method
                        const result = await propertyDescriptor.value(
                            ...methodArgs,
                        );

                        // Assign status code
                        const status = Reflect.getMetadata(
                            genMetadataKey(ROUTER_STATUS_CODE, propertyKey),
                            target,
                        );
                        if (status) {
                            res.statusCode = status;
                        }

                        return res.send(result);
                    } catch (e) {
                        next(e);
                    }
                },
            );

            Reflect.defineMetadata(ROUTER_PATH, router, target);
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
            const metadataKey = genMetadataKey(paramType, propertyKey);
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
