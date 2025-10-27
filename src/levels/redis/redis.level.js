"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisCacheLevel = void 0;
const redlock_1 = require("@sesamecare-oss/redlock");
const constants_1 = require("../../constants");
const cache_utils_1 = require("../../utils/cache.utils");
const version_utils_1 = require("../../utils/version.utils");
class RedisCacheLevel {
    client;
    constructor(client) {
        this.client = client;
    }
    /**
     *
     * @param key - cache key
     * @param valueGetter - function to get the value if not present in cache
     * @param ttl - time to live in seconds
     * @param namespace - used to group related cache entries for easier invalidation
     * @returns
     */
    async get(key, value, ttl) {
        const cachedValue = (await this.client.get(key));
        if (cachedValue === null || cachedValue === undefined) {
            let newValue;
            if (value instanceof Function) {
                newValue = await value();
            }
            else {
                newValue = value;
            }
            await this.set(key, newValue, ttl);
            return newValue;
        }
        return (0, cache_utils_1.parseIfJSON)(cachedValue);
    }
    async set(key, value, ttl = constants_1.DEFAULT_TTL) {
        await this.client.set(key, JSON.stringify(value), "EX", ttl);
        return (0, cache_utils_1.parseIfJSON)(value);
    }
    async del(key) {
        // delete versioned key
        await this.client.del(key);
        // delete version lookup key
        const versionKey = (0, version_utils_1.generateVersionLookupKey)(key);
        await this.client.del(versionKey);
    }
    async lock(key, callback, ttl = 30) {
        const redlockClient = new redlock_1.Redlock([this.client], {
            driftFactor: 0.01,
            retryCount: 10,
            retryDelay: 200,
            retryJitter: 200,
            automaticExtensionThreshold: 500,
        });
        const lock = await redlockClient.acquire([`lock:${key}`], ttl * 1000);
        try {
            const result = await callback();
            return result;
        }
        finally {
            await lock.release();
        }
    }
}
exports.RedisCacheLevel = RedisCacheLevel;
//# sourceMappingURL=redis.level.js.map