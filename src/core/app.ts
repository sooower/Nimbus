import "reflect-metadata";

import { globSync } from "glob";
import bodyParser from "body-parser";
import express, { Express } from "express";
import path from "path";

import { globalConfig } from "./components/config";
import { logger } from "./components/logger";
import { corsMiddleware } from "./middlewares/corsMiddleware";
import { errorMiddleware } from "./middlewares/errorMiddleware";
import { ROUTER_PREFIX, ROUTER_PATH } from "./constants";
import { getEnvBaseDirAndExt } from "./utils/common";

const app = express();

/**
 * Running app(now Express).
 */
async function run() {
    await onReady();

    process.on("SIGINT", async () => {
        await onClose();
        process.exit(0);
    });

    // Handle cors
    app.use(corsMiddleware);

    // Parse request body
    app.use(bodyParser.json());

    // Auto register routes
    autoRegisterRoutes(app);

    // Handle global error
    app.use(errorMiddleware);

    // Run application
    app.listen(globalConfig.port, () => {
        logger.info(`Server started on ${globalConfig.port} (*￣︶￣)`);
    });
}

/**
 * Lifecycle function, do something before app started.
 */
async function onReady() {}

/**
 * Lifecycle function, do something before app shutdown.
 */
async function onClose() {}

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
                        ROUTER_PREFIX,
                        controller,
                    );
                    const router = Reflect.getMetadata(ROUTER_PATH, controller);
                    app.use(routerPrefix, router);
                }
            });
    });
}

export const App = { run };
