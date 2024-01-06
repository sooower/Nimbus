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
} from "../constants";
import { MiddlewareFunc } from "../types";
import { Metadatas } from "../utils/metadatas";

export type CtxSource = "req" | "res" | "requestId" | "query" | "params" | "headers" | "body";

export type CtxMetadata = {
    source?: CtxSource;
    key: string | symbol;
    index: number;
};

export type ClassMetadata = {
    /**
     * Target class.
     */
    clazz: new () => any;

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
    methodParamType: new () => any;
    methodParamIndex: number;
};

export function Controller(prefix?: string): ClassDecorator {
    const routePrefix = prefix == "/" || prefix === undefined ? "" : cutRoutePath(prefix);
    const routeClassMetadata: RouteClassMetadata = { routePrefix };

    return (target: object) => {
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

export function StatusCode(code: number): MethodDecorator {
    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
        Reflect.defineMetadata(KEY_ROUTE_STATUS_CODE, code, target.constructor, key);
    };
}

export function Ctx(source?: CtxSource): ParameterDecorator {
    return (target: object, key: string | symbol | undefined, index: number) => {
        if (key === undefined) {
            return;
        }

        const ctxMetadata: CtxMetadata = { source, key, index };
        Reflect.defineMetadata(KEY_ROUTE_CTX, ctxMetadata, target.constructor, key);
    };
}

function createRouteMethodDecorator(method: RouteMethod) {
    return (path?: string, ...middlewares: MiddlewareFunc[]): MethodDecorator => {
        return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
            path = path == "" || path === undefined ? "/" : cutRoutePath(path);
            const routeMetadata: RouteMetadata = { path, method, middlewares };
            Reflect.defineMetadata(KEY_ROUTE_PATH, routeMetadata, target.constructor, key);
        };
    };
}

function createRouteParamDecorator(metadataKey: string) {
    return (name?: string): ParameterDecorator => {
        return (target: object, key: string | symbol | undefined, index: number) => {
            // Not used for constructor
            if (key === undefined) {
                return;
            }

            const paramTypes: any[] = Reflect.getMetadata("design:paramtypes", target, key) ?? [];
            const paramMetadata: ParamMetadata = {
                routeParamName: name,
                methodParamType: paramTypes[index],
                methodParamIndex: index,
            };
            Metadatas.extendArray(metadataKey, paramMetadata, target.constructor, key);
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
