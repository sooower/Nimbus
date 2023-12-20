import { Express } from "express";
import { globSync } from "glob";
import path from "path";

import { ROUTER_PREFIX, ROUTER_PATH } from "../constants";

import { getEnvBaseDirAndExt } from "./common";

export function autoRegisterRoutes(app: Express): void {
    const { baseDir, ext } = getEnvBaseDirAndExt();
    const files = globSync(`${baseDir}/controller*/**/*.${ext}`);
    files.forEach(it => {
        const obj = require(path.resolve(it));
        Object.keys(obj)
            .filter(it => it.endsWith("Controller"))
            .forEach(it => {
                const controller = obj[it].prototype;
                if (controller) {
                    const routerPrefix = Reflect.getMetadata(
                        ROUTER_PREFIX,
                        controller,
                    );
                    const router = Reflect.getMetadata(ROUTER_PATH, controller);
                    app.use(routerPrefix, router);
                }
            });
    });
}

export function cutRoutePath(str: string): string {
    if (!str.startsWith("/")) {
        str = "/" + str;
    }
    if (str.endsWith("/")) {
        str = str.slice(0, str.length - 1);
    }
    return str;
}
