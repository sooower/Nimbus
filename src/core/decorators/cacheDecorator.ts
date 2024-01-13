import { objectsFactory } from "@/main";

import { logger } from "../components/logger";
import { RedisService } from "../services/redisService";
import { Commons } from "../utils/commons";

type CacheSetOptions = {
    scope: string;
    key: string;
    ttl: number;
};

type CacheRemoveOptions = {
    scope: string;
    key: string;
};

export function Cacheable(options: CacheSetOptions): MethodDecorator {
    const redisService = objectsFactory.getObject<RedisService>("RedisService");

    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const key = parseKeyWithMethodsParams(options.key, originalMethod, args);

            const cacheKey = Commons.generateCacheKey(options.scope, key);

            if (await redisService.has(cacheKey)) {
                logger.debug("Fetching data from cache.");

                return await redisService.get(cacheKey);
            }

            const res = await originalMethod.apply(this, args);

            // Cache data
            if (res) {
                options.ttl > 0
                    ? await redisService.setWithTTL(cacheKey, res, options.ttl)
                    : await redisService.set(cacheKey, res);
                logger.debug(
                    `Cached data, Key <${cacheKey}> set with value <${res}> and TTL <${options.ttl}> second.`,
                );
            }

            return res;
        };

        return descriptor;
    };
}

export function CachePut(options: CacheSetOptions): MethodDecorator {
    const redisService = objectsFactory.getObject<RedisService>("RedisService");

    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const res = await originalMethod.apply(this, args);

            // Cache data
            if (res) {
                const key = parseKeyWithMethodsParams(options.key, originalMethod, args);
                const cacheKey = Commons.generateCacheKey(options.scope, key);

                options.ttl > 0
                    ? await redisService.setWithTTL(cacheKey, res, options.ttl)
                    : await redisService.set(cacheKey, res);
                logger.debug(
                    `Cached data, Key <${cacheKey}> set with value <${res}> and TTL <${options.ttl}> second.`,
                );
            }

            return res;
        };

        return descriptor;
    };
}

export function CacheEvict(options: CacheRemoveOptions): MethodDecorator {
    const redisService = objectsFactory.getObject<RedisService>("RedisService");

    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const res = await originalMethod.apply(this, args);

            // Remove cache
            const key = parseKeyWithMethodsParams(options.key, originalMethod, args);
            const cacheKey = Commons.generateCacheKey(options.scope, key);
            if (await redisService.has(cacheKey)) {
                await redisService.remove(cacheKey);
                logger.debug(`Removed cache, Key <${cacheKey}>.`);
            }

            return res;
        };

        return descriptor;
    };
}

/**
 * Parse `key` in Decorator with method's params value if it starts with ":".
 *
 * @param originStr Cache key
 * @param method Cache method
 * @param methodArgs Cache methods args
 * @returns Key with parsed params value
 */
function parseKeyWithMethodsParams(
    originStr: string,
    method: (...args: any[]) => Promise<any>,
    methodArgs: any[],
) {
    let res: string = originStr;

    // Set cache key with params value
    if (originStr.startsWith(":")) {
        const paramNamesMap = Commons.getParamNamesWithIndex(method);
        for (const [arg, index] of paramNamesMap) {
            if (arg === originStr.slice(1)) {
                res = methodArgs[index];
                break;
            }
        }
    }
    return res;
}
