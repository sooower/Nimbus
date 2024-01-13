import "reflect-metadata";

import bodyParser from "body-parser";
import express from "express";

import { globalConfig } from "../components/config";
import { logger } from "../components/logger";
import { corsMiddleware } from "../middlewares/corsMiddleware";
import { errorMiddleware } from "../middlewares/errorMiddleware";
import { ObjectsFactory } from "./objectsFactory";
import { Route } from "./route";

type LifecycleEvents = {
    /**
     * Do something before application started.
     */
    onReady: () => Promise<void>;

    /**
     * Do something before application shutdown.
     */
    onClose: () => Promise<void>;
};

export class Application {
    constructor(private lifecycleEvents: LifecycleEvents) {}

    /**
     * The bootstrap to running an application.
     */
    async run() {
        await this.registerLifecycleEvents();

        const engine = express();

        engine.use(corsMiddleware);
        engine.use(bodyParser.json());

        const objectsFactory = new ObjectsFactory();
        objectsFactory.initialize();

        await new Route(objectsFactory, engine).initialize();

        engine.use(errorMiddleware);

        engine.listen(globalConfig.port, () => {
            logger.info(`Server started on ${globalConfig.port}.`);
        });
    }

    private async registerLifecycleEvents() {
        const { onReady, onClose } = this.lifecycleEvents;
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
}
