import { Express } from "express";
import { globSync } from "glob";
import path from "path";
import { ROUTER_PATH, ROUTER_PREFIX } from "../decorators/route.decorator";

export function autoRegisterRoutes(app: Express): void {
    const files = globSync(process.env.NODE_ENV === "prod" ? "dist/controllers/**/*.js" : "src/controllers/**/*.ts");
    files.forEach(it => {
        const obj = require(path.resolve(it));
        Object.keys(obj)
            .filter(it => it.endsWith("Controller"))
            .forEach(it => {
                const handler = obj[it].prototype;
                if (handler) {
                    const routerPrefix = Reflect.getMetadata(ROUTER_PREFIX, handler);
                    const routerPath = Reflect.getMetadata(ROUTER_PATH, handler);
                    app.use(routerPrefix, routerPath);
                }
            });
    });
}

function loadConfig(): any {
    const env = process.env.NODE_ENV ?? "dev";
    let dir: string, ext: string;
    if (env === "prod") {
        (dir = "dist"), (ext = "js");
    } else {
        (dir = "src"), (ext = "ts");
    }
    const defaultConfig = require(path.resolve(`${dir}/config/config.${ext}`)).default;
    const envConfig = require(path.resolve(`${dir}/config/config.${env}.${ext}`)).default;
    return mergeObjects(envConfig, defaultConfig);
}

export const config = loadConfig();

export function cutRoutePath(str: string): string {
    if (!str.startsWith("/")) {
        str = "/" + str;
    }
    if (str.endsWith("/")) {
        str = str.slice(0, str.length - 1);
    }
    return str;
}

export function mergeObjects(from: any, to: any): any {
    const merged = { ...to };

    for (const key in from) {
        if (from.hasOwnProperty(key)) {
            if (typeof from[key] === "object" && to.hasOwnProperty(key) && typeof to[key] === "object") {
                merged[key] = mergeObjects(from[key], to[key]);
            } else {
                merged[key] = from[key];
            }
        }
    }

    return merged;
}
