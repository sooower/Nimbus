import Redis, { RedisOptions } from "ioredis";
import stringify from "safe-stable-stringify";

import { Objects } from "../utils/objects";
import { globalConfig } from "./config";
import { logger } from "./logger";

const cacheClient = getRedisCacheClient();

function getRedisCacheClient() {
    const redis = new Redis(
        Objects.merge<RedisOptions>(globalConfig.redis, {
            host: "localhost",
            port: 6379,
        }),
    );
    logger.info(`Cache client initialized.`);

    return redis;
}

export const CacheClient = {
    async set(key: string, value: any) {
        if (stringify(value) !== undefined) {
            return !!cacheClient.set(key, stringify(value)!);
        }

        return true;
    },

    async setWithTTL(key: string, value: any, ttl = 300) {
        if (stringify(value) !== undefined) {
            return !!cacheClient.set(key, stringify(value)!, "EX", ttl);
        }

        return true;
    },

    async setnxWithTTL(key: string, value: string, ttl = 300) {
        const res = !!(await cacheClient.setnx(key, value));

        if (!res) {
            logger.warn(`Key ${key} already exists.`);

            return false;
        }
        await cacheClient.expire(key, ttl);

        return true;
    },

    async get(key: string) {
        const res = await cacheClient.get(key);

        return res ? JSON.parse(res) : null;
    },

    async remove(key: string) {
        return !!(await cacheClient.del(key));
    },

    async has(key: string) {
        return !!(await cacheClient.exists(key));
    },

    async quit() {
        return !!(await cacheClient.quit());
    },
};
