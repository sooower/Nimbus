import { globalConfig } from "@/core/components/config";
import { logger } from "@/core/components/logger";
import { Objects } from "@/core/utils";
import Redis, { RedisOptions } from "ioredis";
import stringify from "safe-stable-stringify";

const cacheClient = getRedisCacheClient();

function getRedisCacheClient() {
    const redis = new Redis(
        Objects.mergeObjects<RedisOptions>(globalConfig.redis, {
            host: "localhost",
            port: 6379,
        }),
    );
    logger.info(`Cache client initialized.`);

    return redis;
}

export const CacheClient = {
    async set(key: string, value: any) {
        return cacheClient.set(key, stringify(value)!);
    },

    async setWithTTL(key: string, value: any, ttl = 300) {
        return cacheClient.set(key, stringify(value)!, "EX", ttl);
    },

    async setnxWithTTL(key: string, value: string, ttl = 300) {
        const res = await cacheClient.setnx(key, value);

        if (res !== 1) {
            logger.warn(`Key ${key} already exists`);

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
        await cacheClient.quit();
    },
};
