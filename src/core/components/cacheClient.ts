import { globalConfig } from "@/core/components/config";
import { logger } from "@/core/components/logger";
import { Objects } from "@/core/utils/objects";
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

async function set(key: string, value: any) {
    return cacheClient.set(key, stringify(value)!);
}

async function setWithTTL(key: string, value: any, ttl = 300) {
    return cacheClient.set(key, stringify(value)!, "EX", ttl);
}

async function setnxWithTTL(key: string, value: string, ttl = 300) {
    const res = await cacheClient.setnx(key, value);

    if (res !== 1) {
        logger.warn(`Key ${key} already exists`);

        return false;
    }
    await cacheClient.expire(key, ttl);

    return true;
}

async function get(key: string) {
    const res = await cacheClient.get(key);

    return res ? JSON.parse(res) : null;
}

async function remove(key: string) {
    return !!(await cacheClient.del(key));
}

async function has(key: string) {
    return !!(await cacheClient.exists(key));
}

async function quit() {
    await cacheClient.quit();
}

export const CacheClient = {
    get,
    set,
    setWithTTL,
    setnxWithTTL,
    remove,
    has,
    quit,
};
