import Redis, { RedisOptions } from "ioredis";
import stringify from "safe-stable-stringify";

import { globalConfig } from "../components/config";
import { logger } from "../components/logger";
import { Commons } from "../utils/commons";
import { Objects } from "../utils/objects";

export enum TimeUnit {
    Second,
    Minute,
    Hour,
    Day,
    Week,
    Month,
}

class CacheClient {
    private redis: Redis;

    constructor() {
        this.redis = new Redis(
            Objects.merge<RedisOptions>(globalConfig.redis, {
                host: "localhost",
                port: 6379,
            }),
        );
        logger.info(`Redis initialized.`);
    }

    async set(key: string, value: any) {
        if (stringify(value) !== undefined) {
            return !!this.redis.set(key, stringify(value)!);
        }

        return true;
    }

    async setWithTTL(key: string, value: any, ttl = 300, timeUnit = TimeUnit.Second) {
        if (stringify(value) !== undefined) {
            return !!this.redis.set(
                key,
                stringify(value)!,
                "EX",
                Commons.parseSeconds(ttl, timeUnit),
            );
        }

        return true;
    }

    async setnxWithTTL(key: string, value: string, ttl = 300, timeUnit = TimeUnit.Second) {
        const res = !!(await this.redis.setnx(key, value));

        if (!res) {
            logger.warn(`Key ${key} already exists.`);

            return false;
        }

        await this.redis.expire(key, Commons.parseSeconds(ttl, timeUnit));

        return true;
    }

    async get(key: string) {
        const res = await this.redis.get(key);

        return res ? JSON.parse(res) : null;
    }

    async remove(key: string) {
        return !!(await this.redis.del(key));
    }

    async has(key: string) {
        return !!(await this.redis.exists(key));
    }

    async quit() {
        return (await this.redis.quit()) === "OK";
    }
}

export const cacheClient = new CacheClient();
