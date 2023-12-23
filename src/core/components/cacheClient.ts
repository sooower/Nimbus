import Redis from "ioredis";

import { globalConfig } from "./config";
import { logger } from "./logger";

function getRedisCacheClient() {
    const redis = new Redis(
        globalConfig.redis ?? {
            host: "localhost",
            port: 6379,
        },
    );
    logger.info(`Cache client initialized.`);

    return redis;
}

export const cacheClient = getRedisCacheClient();

export async function setWithTTL(key: string, value: string, ttl = 300) {
    return await cacheClient.set(key, value, "EX", ttl);
}

export async function setnxWithTTL(key: string, value: string, ttl = 300) {
    const res = await cacheClient.setnx(key, value);

    if (res !== 1) {
        logger.warn(`Key ${key} already exists`);

        return false;
    }
    await cacheClient.expire(key, ttl);

    return true;
}
