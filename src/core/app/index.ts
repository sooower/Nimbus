import "reflect-metadata";
import bodyParser from "body-parser";
import express, { Express } from "express";
import { corsMiddleware } from "@/core/middlewares/corsMiddleware";
import { errorMiddleware } from "@/core/middlewares/errorMiddleware";
import { globalConfig } from "@/core/components/config";
import { logger } from "@/core/components/logger";
import { ObjectsFactory } from "@/core/app/objectsFactory";
import { Route } from "@/core/app/route";

type LifecycleEvents = {
    /**
     * Do something before application started.
     */
    onReady: Function;

    /**
     * Do something before application shutdown.
     */
    onClose: Function;
};

export class Application {
    constructor(private lifecycleEvents: LifecycleEvents) {}

    /**
     * The bootstrap to running an application.
     */
    async run() {
        await this.registerLifecycleEvents();

        const engine: Express = express();

        engine.use(corsMiddleware);
        engine.use(bodyParser.json());

        const objectsFactory = new ObjectsFactory();
        objectsFactory.initialize();

        await new Route(objectsFactory, engine).initialize();

        engine.use(errorMiddleware);

        engine.listen(globalConfig.port, () => {
            logger.info(`Server started on ${globalConfig.port} (*￣︶￣).`);
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
