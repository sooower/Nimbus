import { Request, Response, NextFunction, Router } from "express";

export const ROUTER_PREFIX = "router_prefix";
export const ROUTER_PATH = "router_path";

export function Handler(prefix?: string): ClassDecorator {
    const routePath = prefix == "/" || !prefix ? "" : prefix;
    return function (target: any) {
        Reflect.defineMetadata(ROUTER_PREFIX, routePath, target.prototype);
    };
}

function createRouteDecorator(method: string) {
    return function (
        path?: string,
        ...middlewares: ((req: Request, res: Response, next: NextFunction) => Promise<void>)[]
    ) {
        return function (target: any, propertyKey: string, _: PropertyDescriptor) {
            const router = Reflect.getMetadata(ROUTER_PATH, target) || Router();
            const routePath = path == "" || !path ? "/" : path;
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
