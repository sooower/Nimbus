import { Application } from "./app";
import { ObjectsFactory } from "./app/objectsFactory";
import { cacheService } from "./common/services/cacheService";
import { dataSourceService } from "./common/services/dataSourceService";
import { loggerService } from "./common/services/loggerService";

export const objectsFactory = new ObjectsFactory();

void new Application(objectsFactory, {
    async beforeReady() {
        await dataSourceService.initialize();
        loggerService.info("Data Source initialized.");
    },

    async beforeDestroy() {
        await dataSourceService.destroy();
        loggerService.info("Data Source destroyed.");

        await cacheService.quit();
        loggerService.info(`"RedisService" destroyed.`);
    },
}).run();
