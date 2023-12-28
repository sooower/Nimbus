import { MiddlewareFunc } from "@/core/types";
import {
    KEY_INJECTABLE,
    KEY_ROUTE_BODY,
    KEY_ROUTE_CLASS,
    KEY_ROUTE_CTX,
    KEY_ROUTE_HEADERS,
    KEY_ROUTE_PARAMS,
    KEY_ROUTE_PATH,
    KEY_ROUTE_QUERY,
    KEY_ROUTE_STATUS_CODE,
} from "@/core/constants";

export type CtxSource =
    | "req"
    | "res"
    | "requestId"
    | "query"
    | "params"
    | "headers"
    | "body";

export type CtxMetadata = {
    source?: CtxSource;
    propertyKey: string;
    paramIdx: number;
};

export type ClassMetadata = {
    clazz: any;

    constructorParamTypesMetadata: any[];

    /**
     * Other member methods args metadata.
     */
    methodArgsMetadata: Map<string, string[]>;
};

export type RouteMethod = "get" | "post" | "put" | "patch" | "delete";

export type RouteMetadata = {
    path: string;
    method: RouteMethod;
    middlewares: MiddlewareFunc[];
};

export type RouteClassMetadata = {
    routePrefix: string;
};

export type ParamMetadata = {
    paramName?: string;
    paramIndex: number;
};

export function Controller(prefix?: string): ClassDecorator {
    const routePrefix = prefix == "/" || !prefix ? "" : cutRoutePath(prefix);
    const routeClassMetadata: RouteClassMetadata = { routePrefix };

    return function (target: any) {
        Reflect.defineMetadata(KEY_ROUTE_CLASS, routeClassMetadata, target);
        Reflect.defineMetadata(KEY_INJECTABLE, true, target);
    };
}

export const Get = createRouteMethodDecorator("get");
export const Post = createRouteMethodDecorator("post");
export const Patch = createRouteMethodDecorator("patch");
export const Put = createRouteMethodDecorator("put");
export const Delete = createRouteMethodDecorator("delete");

export const Query = createParamDecorator(KEY_ROUTE_QUERY);
export const Param = createParamDecorator(KEY_ROUTE_PARAMS);
export const Headers = createParamDecorator(KEY_ROUTE_HEADERS);
export const Body = createParamDecorator(KEY_ROUTE_BODY);

export function StatusCode(code: number) {
    return function (target: any, propertyKey: string, _: PropertyDescriptor) {
        Reflect.defineMetadata(
            KEY_ROUTE_STATUS_CODE,
            code,
            target,
            propertyKey,
        );
    };
}

export function Ctx(source?: CtxSource) {
    return function (target: object, propertyKey: string, paramIdx: number) {
        // Collect Context metadata
        const ctxMetadata: CtxMetadata = {
            source,
            propertyKey,
            paramIdx,
        };
        Reflect.defineMetadata(KEY_ROUTE_CTX, ctxMetadata, target, propertyKey);
    };
}

function createRouteMethodDecorator(method: RouteMethod) {
    return function (path?: string, ...middlewares: MiddlewareFunc[]) {
        return function (target: object, propertyKey: string) {
            path = path == "" || !path ? "/" : cutRoutePath(path);
            const routeMetadata: RouteMetadata = {
                path,
                method,
                middlewares,
            };
            Reflect.defineMetadata(
                KEY_ROUTE_PATH,
                routeMetadata,
                target,
                propertyKey,
            );
        };
    };
}

function createParamDecorator(metadataKey: string) {
    return function (paramName?: string) {
        return function (
            target: object,
            propertyKey: string,
            paramIndex: number,
        ) {
            const paramMetadata: ParamMetadata = {
                paramName,
                paramIndex,
            };
            extendMetadata(metadataKey, paramMetadata, target, propertyKey);
        };
    };
}

function extendMetadata(
    metadataKey: string,
    value: any,
    target: any,
    propertyKey: string,
) {
    const originValues: any[] =
        Reflect.getMetadata(metadataKey, target, propertyKey) ?? [];
    Reflect.defineMetadata(
        metadataKey,
        [...originValues, value],
        target,
        propertyKey,
    );
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
