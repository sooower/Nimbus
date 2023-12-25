import "reflect-metadata";

import bodyParser from "body-parser";
import express, { Express } from "express";
import { globSync } from "glob";
import path from "path";

import { ds } from "@/core/components/dataSource";

import { cacheClient } from "./components/cacheClient";
import { globalConfig } from "./components/config";
import { logger } from "./components/logger";
import { KEY_ROUTER_HANDLER, KEY_ROUTER_PREFIX } from "./constants";
import { corsMiddleware } from "./middlewares/corsMiddleware";
import { errorMiddleware } from "./middlewares/errorMiddleware";
import { getEnvBaseDirAndExt } from "./utils";

const app = express();

/**
 * Running app(now Express).
 */
async function run() {
    await registerLifecycleEvents();

    app.use(corsMiddleware);

    app.use(bodyParser.json());

    autoRegisterRoutes(app);

    app.use(errorMiddleware);

    app.listen(globalConfig.port, () => {
        logger.info(`Server started on ${globalConfig.port} (*￣︶￣).`);
    });
}

async function registerLifecycleEvents() {
    await onReady();

    process.on("SIGINT", async () => {
        await onClose();
        process.exit(0);
    });
    process.on("SIGTERM", async () => {
        await onClose();
        process.exit(0);
    });
}

/**
 * Lifecycle function, do something before app started.
 */
async function onReady() {
    try {
        // to initialize the initial connection with the database, register all entities
        // and "synchronize" database schema, call "initialize()" method of a newly created database
        // once in your application bootstrap
        await ds.initialize();
        logger.info("Data Source initialized.");
    } catch (err) {
        throw new Error(
            `Failed when executing lifecycle event "onReady". ${err}.`,
        );
    }
}

/**
 * Lifecycle function, do something before app shutdown.
 */
async function onClose() {
    try {
        await ds.destroy();
        logger.info("Data Source destroyed.");

        await cacheClient.quit();
        logger.info("Cache client closed.");
    } catch (err) {
        throw new Error(
            `Failed when executing lifecycle event "onClose". ${err}.`,
        );
    }
}

/**
 * Scan files and register routes into app(now Express).
 * @param app
 */
function autoRegisterRoutes(app: Express): void {
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
                        KEY_ROUTER_PREFIX,
                        controller,
                    );
                    const router = Reflect.getMetadata(
                        KEY_ROUTER_HANDLER,
                        controller,
                    );
                    app.use(routerPrefix, router);
                }
            });
    });
}

export const App = { run };
