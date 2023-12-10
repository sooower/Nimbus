import { Express } from "express";
import { globSync } from "glob";
import path from "path";

import { ROUTER_PATH, ROUTER_PREFIX } from "./decorators/route.decorator";

function getEnvBaseDirAndExt(): { env: string; baseDir: string; ext: string } {
    const env = process.env.NODE_ENV ?? "dev";
    return {
        env,
        baseDir: env === "prod" ? "dist" : "src",
        ext: env === "prod" ? "js" : "ts",
    };
}

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

function loadConfig(): any {
    const { env, baseDir, ext } = getEnvBaseDirAndExt();
    const defaultConfig = require(
        path.resolve(`${baseDir}/config/config.${ext}`),
    ).default;
    const envConfig = require(
        path.resolve(`${baseDir}/config/config.${env}.${ext}`),
    ).default;
    return mergeObjects(envConfig, defaultConfig);
}

export const globalConfig = loadConfig();

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
            if (
                typeof from[key] === "object" &&
                to.hasOwnProperty(key) &&
                typeof to[key] === "object"
            ) {
                merged[key] = mergeObjects(from[key], to[key]);
            } else {
                merged[key] = from[key];
            }
        }
    }

    return merged;
}

export function generateRequestId(length: number = 7): string {
    const chars = "0123456789abcdefghijklmnopqrstuvwxyz";
    let result = "";
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
