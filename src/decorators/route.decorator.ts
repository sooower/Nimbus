import { Request, Response, NextFunction, Router } from "express";

export const ROUTER_PREFIX = "router_prefix";
export const ROUTER_PATH = "router_path";

export function Handler(prefix?: string): ClassDecorator {
    let routePrefix = prefix == "/" || !prefix ? "" : prefix; // FIXME

    if (!routePrefix.startsWith("/")) {
        routePrefix = "/" + routePrefix;
    }
    if (routePrefix.endsWith("/")) {
        routePrefix = routePrefix.slice(0, routePrefix.length - 1);
    }

    return function (target: any) {
        Reflect.defineMetadata(ROUTER_PREFIX, routePrefix, target.prototype);
    };
}

function createRouteDecorator(method: string) {
    return function (
        path?: string,
        ...middlewares: ((req: Request, res: Response, next: NextFunction) => Promise<void>)[]
    ): MethodDecorator {
        return function (target: any, propertyKey: string | symbol, _: PropertyDescriptor) {
            const routePath = path == "" || !path ? "/" : path.startsWith("/") ? path : "/" + path;
            const router = Reflect.getMetadata(ROUTER_PATH, target) || Router();
            router[method](routePath, ...middlewares, target[propertyKey]);
            Reflect.defineMetadata(ROUTER_PATH, router, target);
        };
    };
}

export const Get = createRouteDecorator("get");
export const Post = createRouteDecorator("post");
export const Patch = createRouteDecorator("patch");
export const Put = createRouteDecorator("put");
export const Delete = createRouteDecorator("delete");
