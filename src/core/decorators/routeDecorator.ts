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
    key: string;
    index: number;
};

export type ClassMetadata = {
    /**
     * Target class.
     */
    clazz: any;

    /**
     * Constructor parameters class metadata.
     */
    ctorParamClassesMetadata: any[];

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
    routeParamName?: string;
    methodParamType: any; // TODO: check for is required?
    methodParamIndex: number;
};

export function Controller(prefix?: string): ClassDecorator {
    const routePrefix =
        prefix == "/" || prefix === undefined ? "" : cutRoutePath(prefix);
    const routeClassMetadata: RouteClassMetadata = { routePrefix };

    return function (target: object) {
        Reflect.defineMetadata(KEY_ROUTE_CLASS, routeClassMetadata, target);
        Reflect.defineMetadata(KEY_INJECTABLE, true, target);
    };
}

export const Get = createRouteMethodDecorator("get");
export const Post = createRouteMethodDecorator("post");
export const Patch = createRouteMethodDecorator("patch");
export const Put = createRouteMethodDecorator("put");
export const Delete = createRouteMethodDecorator("delete");

export const Query = createRouteParamDecorator(KEY_ROUTE_QUERY);
export const Param = createRouteParamDecorator(KEY_ROUTE_PARAMS);
export const Headers = createRouteParamDecorator(KEY_ROUTE_HEADERS);
export const Body = createRouteParamDecorator(KEY_ROUTE_BODY);

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
    return function (target: object, key: string, index: number) {
        // Collect Context metadata
        const ctxMetadata: CtxMetadata = { source, key, index };
        Reflect.defineMetadata(KEY_ROUTE_CTX, ctxMetadata, target, key);
    };
}

function createRouteMethodDecorator(method: RouteMethod) {
    return function (
        path?: string,
        ...middlewares: MiddlewareFunc[]
    ): MethodDecorator {
        return function (
            target: object,
            key: string | symbol,
            descriptor: PropertyDescriptor,
        ) {
            path = path == "" || path === undefined ? "/" : cutRoutePath(path);
            const routeMetadata: RouteMetadata = { path, method, middlewares };
            Reflect.defineMetadata(KEY_ROUTE_PATH, routeMetadata, target, key);
        };
    };
}

function createRouteParamDecorator(metadataKey: string) {
    return function (name?: string): ParameterDecorator {
        return function (
            target: object,
            key: string | symbol | undefined,
            index: number,
        ) {
            // Not used for constructor
            if (key === undefined) {
                return;
            }

            const paramTypes: any[] =
                Reflect.getMetadata("design:paramtypes", target, key) ?? [];
            const paramMetadata: ParamMetadata = {
                routeParamName: name,
                methodParamType: paramTypes[index], // TODO: Check for is required?
                methodParamIndex: index,
            };
            extendMetadata(metadataKey, paramMetadata, target, key);
        };
    };
}

function extendMetadata(
    metadataKey: string,
    value: any,
    target: any,
    key: string | symbol,
) {
    const originValues: any[] =
        Reflect.getMetadata(metadataKey, target, key) ?? [];
    Reflect.defineMetadata(metadataKey, [...originValues, value], target, key);
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
