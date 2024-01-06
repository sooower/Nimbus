import { Application } from "./core/app";
import { CacheClient } from "./core/components/cacheClient";
import { DS } from "./core/components/dataSource";
import { logger } from "./core/components/logger";

new Application({
    async onReady() {
        await DS.initialize();
        logger.info("Data Source initialized.");
    },

    async onClose() {
        await DS.destroy();
        logger.info("Data Source destroyed.");

        await CacheClient.quit();
        logger.info("Cache client closed.");
    },
}).run();
