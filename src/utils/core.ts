import { Express } from "express";
import config from "../config/config";
import { Config } from "../types/core";
import { globSync } from "glob";
import path from "path";
import { ROUTER_PATH, ROUTER_PREFIX } from "../decorators/route.decorator";

export function autoRegisterRoutes(app: Express): void {
    const files = globSync(process.env.NODE_ENV == "prod" ? "dist/controllers/**/*.js" : "src/controllers/**/*.ts");
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

function loadConfig(): Config {
    return config; // TODO load and merge multi environment files
}

export const globalConfig = loadConfig();
