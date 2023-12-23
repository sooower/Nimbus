import stringify from "safe-stable-stringify";

import { cacheClient, setWithTTL } from "../components/cacheClient";
import { logger } from "../components/logger";
import { getParamNamesWithIndex } from "../utils";

type CacheSetOptions = {
    scope: string;
    key: string;
    ttl: number;
};

type CacheRemoveOptions = {
    scope: string;
    key: string;
};

export function Cacheable(options: CacheSetOptions) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            let key: string = parseKeyWithMethodsParams(
                options.key,
                originalMethod,
                args,
            );

            const cacheKey = generateCacheKey(options.scope, key);

            if (await cacheClient.exists(cacheKey)) {
                logger.debug("Fetching data from cache.");
                const res = await cacheClient.get(cacheKey);

                return res ? JSON.parse(res) : null;
            }

            const res = await originalMethod.apply(this, args);

            // Cache data
            if (res) {
                const cacheVal = stringify(res)!;
                await setWithTTL(cacheKey, cacheVal, options.ttl);
                logger.debug(
                    `Cached data, Key <${cacheKey}> set with value <${cacheVal}> and TTL <${options.ttl}> second.`,
                );
            }

            return res;
        };

        return descriptor;
    };
}

export function CachePut(options: CacheSetOptions) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const res = await originalMethod.apply(this, args);

            // Cache data
            if (res) {
                let key = parseKeyWithMethodsParams(
                    options.key,
                    originalMethod,
                    args,
                );
                const cacheKey = generateCacheKey(options.scope, key);
                const cacheVal = stringify(res)!;

                await setWithTTL(cacheKey, cacheVal, options.ttl);
                logger.debug(
                    `Cached data, Key <${cacheKey}> set with value <${cacheVal}> and TTL <${options.ttl}> second.`,
                );
            }

            return res;
        };

        return descriptor;
    };
}

export function CacheEvict(options: CacheRemoveOptions) {
    return function (
        target: any,
        propertyKey: string,
        descriptor: PropertyDescriptor,
    ) {
        const originalMethod = descriptor.value;

        descriptor.value = async function (...args: any[]) {
            const res = await originalMethod.apply(this, args);

            // Remove cache
            let key = parseKeyWithMethodsParams(
                options.key,
                originalMethod,
                args,
            );
            const cacheKey = generateCacheKey(options.scope, key);
            if (await cacheClient.exists(cacheKey)) {
                await cacheClient.del(cacheKey);
                logger.debug(`Removed cache, Key <${cacheKey}>.`);
            }

            return res;
        };

        return descriptor;
    };
}

/**
 * Parse `key` in Decorator with method's params value if it start with ":".
 *
 * @param originStr Cache key
 * @param method Cache method
 * @param methodArgs Cache methods args
 * @returns Key with parsed params value
 */
function parseKeyWithMethodsParams(
    originStr: string,
    method: Function,
    methodArgs: any[],
) {
    let res: string = originStr;

    // Set cache key with params value
    if (originStr.startsWith(":")) {
        const paramNamesMap = getParamNamesWithIndex(method);
        for (const [arg, index] of paramNamesMap) {
            if (arg === originStr.slice(1)) {
                res = methodArgs[index];
                break;
            }
        }
    }
    return res;
}

function generateCacheKey(...args: string[]) {
    return args.join("@").replace(/:/g, "@");
}
