import stringify from "safe-stable-stringify";

import { cacheClient } from "../components/cacheClient";
import { logger } from "../components/logger";
import { CacheError } from "../errors";
import { Commons, TimeUnit } from "../utils/commons";

type CacheSetOptions = {
    scope: string;
    key: string;
    ttl: number;
    timeUnit?: TimeUnit;
};

type CacheRemoveOptions = {
    scope: string;
    key: string;
};

export function Cacheable(options: CacheSetOptions): MethodDecorator {
    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const key = parseKeyWithMethodsParams(options.key, originalMethod, args);

            const cacheKey = Commons.generateCacheKey(options.scope, key);

            if (await cacheClient.has(cacheKey)) {
                logger.debug("Fetching data from cache.");

                return await cacheClient.get(cacheKey);
            }

            const res = await originalMethod.apply(this, args);

            // Cache data
            if (res !== undefined) {
                if (options.ttl <= 0) {
                    throw new CacheError(`Cache key "${cacheKey}" must have a TTL greater than 0.`);
                }

                await cacheClient.setWithTTL(cacheKey, res, options.ttl, options.timeUnit);
                logger.debug(`Cached data, Key "${cacheKey}" set with TTL ${options.ttl} second.`);
            }

            return res;
        };

        return descriptor;
    };
}

export function CachePut(options: CacheSetOptions): MethodDecorator {
    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const res = await originalMethod.apply(this, args);

            // Cache data
            if (res !== undefined) {
                const key = parseKeyWithMethodsParams(options.key, originalMethod, args);
                const cacheKey = Commons.generateCacheKey(options.scope, key);

                if (options.ttl <= 0) {
                    throw new CacheError(`Cache key "${cacheKey}" must have a TTL greater than 0.`);
                }

                await cacheClient.setWithTTL(cacheKey, res, options.ttl, options.timeUnit);
                logger.debug(`Cached data, Key "${cacheKey}" set with TTL ${options.ttl} second.`);
            }

            return res;
        };

        return descriptor;
    };
}

export function CacheEvict(options: CacheRemoveOptions): MethodDecorator {
    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const res = await originalMethod.apply(this, args);

            // Remove cache
            const key = parseKeyWithMethodsParams(options.key, originalMethod, args);
            const cacheKey = Commons.generateCacheKey(options.scope, key);
            if (await cacheClient.has(cacheKey)) {
                await cacheClient.remove(cacheKey);
                logger.debug(`Removed cache, Key "${cacheKey}".`);
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
                res = stringify(methodArgs[index]) ?? "";
                break;
            }
        }
    }
    return res;
}
