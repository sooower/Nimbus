import Redis, { RedisOptions } from "ioredis";
import stringify from "safe-stable-stringify";

import { CommonUtil } from "../utils/commonUtil";
import { ObjectsUtil } from "../utils/objectUtil";
import { configService } from "./configService";
import { loggerService } from "./loggerService";

export enum TimeUnit {
    Second,
    Minute,
    Hour,
    Day,
    Week,
    Month,
}

const redis = initRedis();

function initRedis() {
    const redis = new Redis(
        ObjectsUtil.merge<RedisOptions>(configService.redis, {
            host: "localhost",
            port: 6379,
        }),
    );
    loggerService.info(`Redis initialized.`);

    return redis;
}

async function set(key: string, value: any) {
    if (stringify(value) !== undefined) {
        return !!redis.set(key, stringify(value)!);
    }

    return true;
}

async function setWithTTL(key: string, value: any, ttl = 300, timeUnit = TimeUnit.Second) {
    if (stringify(value) !== undefined) {
        return !!redis.set(key, stringify(value)!, "EX", CommonUtil.parseSeconds(ttl, timeUnit));
    }

    return true;
}

async function setnxWithTTL(key: string, value: string, ttl = 300, timeUnit = TimeUnit.Second) {
    const res = !!(await redis.setnx(key, value));

    if (!res) {
        loggerService.warn(`Key ${key} already exists.`);

        return false;
    }

    await redis.expire(key, CommonUtil.parseSeconds(ttl, timeUnit));

    return true;
}

async function get(key: string) {
    const res = await redis.get(key);

    return res ? JSON.parse(res) : null;
}

async function remove(key: string) {
    return !!(await redis.del(key));
}

async function has(key: string) {
    return !!(await redis.exists(key));
}

async function quit() {
    return (await redis.quit()) === "OK";
}

export const cacheService = {
    set,
    setWithTTL,
    setnxWithTTL,
    get,
    remove,
    has,
    quit,
};
