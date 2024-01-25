import "reflect-metadata";

import bodyParser from "body-parser";
import express from "express";

import { corsMiddleware } from "@/common/middlewares/corsMiddleware";
import { errorMiddleware } from "@/common/middlewares/errorMiddleware";
import { bannerService } from "@/common/services/bannerService";
import { configService } from "@/common/services/configService";
import { loggerService } from "@/common/services/loggerService";

import { ObjectsFactory } from "./objectsFactory";
import { Route } from "./route";

type LifecycleEvents = {
    /**
     * Do something before application started.
     */
    beforeReady: () => Promise<void>;

    /**
     * Do something before application shutdown.
     */
    beforeDestroy: () => Promise<void>;
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
        bannerService.printBanner();

        await this.registerLifecycleEvents();

        const engine = express();

        engine.use(corsMiddleware);
        engine.use(bodyParser.json());

        await new Route(this.objectsFactory, engine).initialize();

        engine.use(errorMiddleware);

        engine.listen(configService.port, () => {
            loggerService.info(`Server started on ${configService.port}.`);
        });
    }

    private async onReady() {
        await this.lifecycleEvents.beforeReady();
    }

    private async onDestroy() {
        await this.lifecycleEvents.beforeDestroy();
        this.objectsFactory.destroy();
    }

    private async registerLifecycleEvents() {
        await this.onReady();

        process.on("SIGINT", async () => {
            await this.onDestroy();
            process.exit(0);
        });
        process.on("SIGTERM", async () => {
            await this.onDestroy();
            process.exit(0);
        });
    }
}
