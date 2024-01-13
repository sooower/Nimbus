import "reflect-metadata";

import bodyParser from "body-parser";
import express from "express";

import { printBanner } from "../components/bannerPrinter";
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
    constructor(
        private objectsFactory: ObjectsFactory,
        private lifecycleEvents: LifecycleEvents,
    ) {}

    /**
     * The bootstrap to running an application.
     */
    async run() {
        printBanner();

        await this.registerLifecycleEvents();

        const engine = express();

        engine.use(corsMiddleware);
        engine.use(bodyParser.json());

        await new Route(this.objectsFactory, engine).initialize();

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
            this.objectsFactory.destroy();

            process.exit(0);
        });
        process.on("SIGTERM", async () => {
            await onClose();
            this.objectsFactory.destroy();

            process.exit(0);
        });
    }
}
