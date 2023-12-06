import { Router } from "express";

import { cutRoutePath } from "../utils/core";
import { Next, Req, Res } from "../types/core";

export const ROUTER_PREFIX = "router_prefix";
export const ROUTER_PATH = "router_path";

export function Controller(prefix?: string): ClassDecorator {
    const routePrefix = prefix == "/" || !prefix ? "" : cutRoutePath(prefix);
    return function (target: any) {
        Reflect.defineMetadata(ROUTER_PREFIX, routePrefix, target.prototype);
    };
}

function createRouteDecorator(method: string) {
    return function (
        path?: string,
        ...middlewares: ((req: Req, res: Res, next: Next) => Promise<void>)[]
    ): MethodDecorator {
        return function (
            target: any,
            propertyKey: string | symbol,
            _: PropertyDescriptor,
        ) {
            const routePath = path == "" || !path ? "/" : cutRoutePath(path);
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
