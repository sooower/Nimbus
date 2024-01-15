import { Application } from "./core/app";
import { ObjectsFactory } from "./core/app/objectsFactory";
import { cacheClient } from "./core/components/cacheClient";
import { dataSource } from "./core/components/dataSource";
import { logger } from "./core/components/logger";

export const objectsFactory = new ObjectsFactory();

new Application(objectsFactory, {
    async beforeReady() {
        await dataSource.initialize();
        logger.info("Data Source initialized.");
    },

    async beforeDestroy() {
        await dataSource.destroy();
        logger.info("Data Source destroyed.");

        await cacheClient.quit();
        logger.info(`"RedisService" destroyed.`);
    },
}).run();
