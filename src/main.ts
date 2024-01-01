import { Application } from "@/core/app";
import { logger } from "@/core/components/logger";
import { DS } from "@/core/components/dataSource";
import { CacheClient } from "@/core/components/cacheClient";

new Application({
    async onReady() {
        try {
            // to initialize the initial connection with the database, register all entities
            // and "synchronize" database schema, call "initialize()" method of a newly created database
            // once in your application bootstrap
            await DS.initialize();
            logger.info("Data Source initialized.");
        } catch (err) {
            throw new Error(`Failed when executing lifecycle event "onReady". ${err}.`);
        }
    },

    async onClose() {
        try {
            await DS.destroy();
            logger.info("Data Source destroyed.");

            await CacheClient.quit();
            logger.info("Cache client closed.");
        } catch (err) {
            throw new Error(`Failed when executing lifecycle event "onClose". ${err}.`);
        }
    },
}).run();
