import { Application } from "./core/app";
import { ObjectsFactory } from "./core/app/objectsFactory";
import { DS } from "./core/components/dataSource";
import { logger } from "./core/components/logger";
import { RedisService } from "./core/services/redisService";

export const objectsFactory = new ObjectsFactory();

new Application(objectsFactory, {
    async onReady() {
        await DS.initialize();
        logger.info("Data Source initialized.");
    },

    async onClose() {
        await DS.destroy();
        logger.info("Data Source destroyed.");

        await objectsFactory.getObject<RedisService>("RedisService").quit();
        logger.info(`"RedisService" destroyed.`);
    },
}).run();
