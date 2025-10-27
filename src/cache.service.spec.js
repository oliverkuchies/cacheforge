"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const faker_1 = require("@faker-js/faker");
const redis_1 = require("@testcontainers/redis");
const ioredis_1 = __importDefault(require("ioredis"));
const vitest_1 = require("vitest");
const _1 = require("./");
const version_manager_1 = require("./features/version-manager");
const levels_1 = require("./levels");
const first_expiring_memory_policy_1 = require("./policies/first-expiring-memory.policy");
const memory_percentage_limit_strategy_1 = require("./strategies/memory-percentage-limit.strategy");
let redisContainer;
let redisCache;
let memoryLevel;
let client;
let cacheService;
let versionedCacheService;
let faultyFirstLevelVersionedCacheService;
let faultyFirstLevelCacheService;
let allFaultyLevelsCacheService;
let allFaultyLevelsVersionedCacheService;
const memoryStrategy = new memory_percentage_limit_strategy_1.MemoryPercentageLimitStrategy(70);
const evictionPolicy = new first_expiring_memory_policy_1.FirstExpiringMemoryPolicy();
memoryLevel = new levels_1.MemoryCacheLevel({
    memoryStrategies: [memoryStrategy],
    evictionPolicy: evictionPolicy,
});
const faultyMemoryLevel = new levels_1.MemoryCacheLevel({
    memoryStrategies: [memoryStrategy],
    evictionPolicy: evictionPolicy,
});
const faultyMemoryGet = vitest_1.vi
    .spyOn(faultyMemoryLevel, "get")
    .mockImplementation(() => {
    throw new Error("Faulty Memory Level, failed to get");
});
const faultyMemorySet = vitest_1.vi
    .spyOn(faultyMemoryLevel, "set")
    .mockImplementation(() => {
    throw new Error("Faulty Memory Level, failed to set");
});
const faultyMemoryDel = vitest_1.vi
    .spyOn(faultyMemoryLevel, "del")
    .mockImplementation(() => {
    throw new Error("Faulty Memory Level, failed to delete");
});
(0, vitest_1.describe)("Cache Service with multiple levels and versioning", () => {
    (0, vitest_1.beforeAll)(async () => {
        redisContainer = await new redis_1.RedisContainer("redis:7.2").start();
        client = new ioredis_1.default(redisContainer.getConnectionUrl());
        redisCache = new levels_1.RedisCacheLevel(client);
        cacheService = new _1.CacheService({
            levels: [memoryLevel, redisCache],
        });
        versionedCacheService = new _1.CacheService({
            levels: [memoryLevel, redisCache],
            versioning: true,
        });
        faultyFirstLevelVersionedCacheService = new _1.CacheService({
            levels: [faultyMemoryLevel, redisCache],
            versioning: true,
        });
        faultyFirstLevelCacheService = new _1.CacheService({
            levels: [faultyMemoryLevel, redisCache],
        });
        allFaultyLevelsVersionedCacheService = new _1.CacheService({
            levels: [faultyMemoryLevel, faultyMemoryLevel],
            versioning: true,
        });
        allFaultyLevelsCacheService = new _1.CacheService({
            levels: [faultyMemoryLevel, faultyMemoryLevel],
        });
    });
    (0, vitest_1.it)("should correctly store and retrieve versioned keys across cache levels", async () => {
        const cacheKey = faker_1.faker.string.alpha(10);
        const value = faker_1.faker.string.alpha(10);
        await cacheService.set(cacheKey, value);
        const redisValue = await redisCache.get(cacheKey);
        (0, vitest_1.expect)(redisValue, "Redis cache should return the correct value").toBe(value);
        const memoryValue = await memoryLevel.get(cacheKey);
        (0, vitest_1.expect)(memoryValue, "Memory cache should return the correct value").toBe(value);
    });
    (0, vitest_1.it)("should correctly store and retrieve versioned keys across cache levels- versioned", async () => {
        const cacheKey = faker_1.faker.string.alpha(10);
        const value = faker_1.faker.string.alpha(10);
        const versionedCacheKey = `${cacheKey}:1`;
        await versionedCacheService.set(cacheKey, value);
        const redisValue = await redisCache.get(versionedCacheKey);
        (0, vitest_1.expect)(redisValue, "Redis cache should return the correct value").toBe(value);
        const memoryValue = await memoryLevel.get(versionedCacheKey);
        (0, vitest_1.expect)(memoryValue, "Memory cache should return the correct value").toBe(value);
        const cacheServiceValue = await versionedCacheService.get(cacheKey);
        (0, vitest_1.expect)(cacheServiceValue, "Versioned Cache Service should return the correct value").toBe(value);
        // Now we will invalidate, and it should be undefined
        await versionedCacheService.invalidateKey(cacheKey);
        (0, vitest_1.expect)(await versionedCacheService.get(cacheKey)).toBe(undefined);
    });
    (0, vitest_1.it)("should delete versioned data from all cache levels", async () => {
        const spiedMemoryDel = vitest_1.vi.spyOn(memoryLevel, "del");
        const spiedRedisDel = vitest_1.vi.spyOn(redisCache, "del");
        const cacheKey = faker_1.faker.string.alpha(10);
        const value = faker_1.faker.string.alpha(10);
        await versionedCacheService.set(cacheKey, value);
        await versionedCacheService.del(cacheKey);
        (0, vitest_1.expect)(spiedMemoryDel).toHaveBeenCalledWith(`${cacheKey}:1`);
        (0, vitest_1.expect)(spiedRedisDel).toHaveBeenCalledWith(`${cacheKey}:1`);
        const memoryValue = await memoryLevel.get(`${cacheKey}:1`);
        const redisValue = await redisCache.get(`${cacheKey}:1`);
        (0, vitest_1.expect)(memoryValue).toBeUndefined();
        (0, vitest_1.expect)(redisValue).toBeUndefined();
    });
    (0, vitest_1.it)("should get data from the highest cache level available", async () => {
        const spiedMemoryService = vitest_1.vi.spyOn(memoryLevel, "get");
        const spiedRedisService = vitest_1.vi.spyOn(redisCache, "get");
        const cacheKey = faker_1.faker.string.alpha(10);
        const value = faker_1.faker.string.alpha(10);
        await cacheService.set(cacheKey, value);
        const retrievedValue = await cacheService.get(cacheKey);
        (0, vitest_1.expect)(retrievedValue, "Retrieved value should match the original value").toBe(value);
        (0, vitest_1.expect)(spiedMemoryService).toHaveBeenCalledTimes(1);
        (0, vitest_1.expect)(spiedRedisService).not.toHaveBeenCalled();
    });
    (0, vitest_1.it)("should delete data from all cache levels", async () => {
        const spiedMemoryDel = vitest_1.vi.spyOn(memoryLevel, "del");
        const spiedRedisDel = vitest_1.vi.spyOn(redisCache, "del");
        const cacheKey = faker_1.faker.string.alpha(10);
        const value = faker_1.faker.string.alpha(10);
        await cacheService.set(cacheKey, value);
        await cacheService.del(cacheKey);
        (0, vitest_1.expect)(spiedMemoryDel).toHaveBeenCalledWith(cacheKey);
        (0, vitest_1.expect)(spiedRedisDel).toHaveBeenCalledWith(cacheKey);
        const memoryValue = await memoryLevel.get(cacheKey);
        const redisValue = await redisCache.get(cacheKey);
        (0, vitest_1.expect)(memoryValue).toBeUndefined();
        (0, vitest_1.expect)(redisValue).toBeUndefined();
    });
    (0, vitest_1.it)("should lock and unlock keys correctly across cache levels", async () => {
        const cacheKey = faker_1.faker.string.alpha(10);
        let lockAcquired = false;
        const result = await cacheService.lock(cacheKey, async () => {
            lockAcquired = true;
            return 99;
        }, 5);
        (0, vitest_1.expect)(lockAcquired).toBe(true);
        (0, vitest_1.expect)(result).toBe(99);
    });
    (0, vitest_1.it)("should return null for non-existent keys", async () => {
        const cacheKey = faker_1.faker.string.alpha(10);
        const retrievedValue = await cacheService.get(cacheKey);
        (0, vitest_1.expect)(retrievedValue).toBeNull();
    });
    (0, vitest_1.it)("should throwing a locking exception if all levels do not support locking", async () => {
        const simpleCacheService = new _1.CacheService({
            levels: [memoryLevel],
        });
        const cacheKey = faker_1.faker.string.alpha(10);
        await (0, vitest_1.expect)(simpleCacheService.lock(cacheKey, async () => {
            return "test";
        }, 5)).rejects.toThrowError(`Locking not supported in the current cache levels.`);
    });
    (0, vitest_1.it)("should execute closure to get value if key is missing", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.number.int();
        const retrievedValue = await cacheService.get(testKey, async () => {
            return testValue;
        });
        (0, vitest_1.expect)(retrievedValue).toBe(testValue);
        const cachedValue = await cacheService.get(testKey);
        (0, vitest_1.expect)(cachedValue).toBe(testValue);
    });
    (0, vitest_1.it)("should return correct value for namespaced keys", async () => {
        const mockedMemorySet = vitest_1.vi.spyOn(memoryLevel, "set");
        const mockedMemoryGet = vitest_1.vi.spyOn(memoryLevel, "get");
        const cacheKey = faker_1.faker.string.alpha(10);
        const namespace = faker_1.faker.string.alpha(5);
        const value = faker_1.faker.string.alpha(10);
        await versionedCacheService.set(cacheKey, value, 3600, namespace);
        // The system attempts to receive the version key
        (0, vitest_1.expect)(mockedMemoryGet).toHaveBeenCalledWith(`${namespace}:version`, 1, 604800);
        // Great, the version is now 1.
        // Lets use this to set the value of our cache key
        (0, vitest_1.expect)(mockedMemorySet).toHaveBeenCalledWith(`${cacheKey}:1`, value, 3600);
        (0, vitest_1.expect)(await versionedCacheService.get(cacheKey, undefined, 3600, namespace)).toBe(value);
    });
    (0, vitest_1.it)("should return the values from redis if memory fails in versioned cache", async () => {
        const mockedRedisSet = vitest_1.vi.spyOn(redisCache, "set");
        const mockedRedisGet = vitest_1.vi.spyOn(redisCache, "get");
        const cacheKey = faker_1.faker.string.alpha(10);
        const namespace = faker_1.faker.string.alpha(5);
        const value = faker_1.faker.string.alpha(10);
        await faultyFirstLevelVersionedCacheService.set(cacheKey, value, 3600, namespace);
        (0, vitest_1.expect)(faultyMemoryGet).toHaveBeenCalled();
        (0, vitest_1.expect)(faultyMemorySet).toHaveBeenCalled();
        (0, vitest_1.expect)(mockedRedisSet, "Redis should be called with set").toHaveBeenCalledWith(`${cacheKey}:1`, value, 3600);
        (0, vitest_1.expect)(mockedRedisGet).not.toHaveBeenCalled();
        (0, vitest_1.expect)(await faultyFirstLevelVersionedCacheService.get(cacheKey, undefined, 3600, namespace)).toBe(value);
        await faultyFirstLevelVersionedCacheService.del(cacheKey, namespace);
        (0, vitest_1.expect)(faultyMemoryDel).toBeCalled();
        (0, vitest_1.expect)(await faultyFirstLevelVersionedCacheService.get(cacheKey, undefined, 3600, namespace)).toBe(undefined);
    });
    (0, vitest_1.it)("should return the values from redis if memory fails in non-versioned cache", async () => {
        const mockedRedisSet = vitest_1.vi.spyOn(redisCache, "set");
        const mockedRedisGet = vitest_1.vi.spyOn(redisCache, "get");
        const cacheKey = faker_1.faker.string.alpha(10);
        const namespace = faker_1.faker.string.alpha(5);
        const value = faker_1.faker.string.alpha(10);
        await faultyFirstLevelCacheService.set(cacheKey, value, 3600, namespace);
        (0, vitest_1.expect)(faultyMemoryGet).toHaveBeenCalled();
        (0, vitest_1.expect)(faultyMemorySet).toHaveBeenCalled();
        (0, vitest_1.expect)(mockedRedisSet, "Redis should be called with set").toHaveBeenCalledWith(`${cacheKey}`, value, 3600);
        (0, vitest_1.expect)(mockedRedisGet).not.toHaveBeenCalled();
        (0, vitest_1.expect)(await faultyFirstLevelCacheService.get(cacheKey, undefined, 3600, namespace)).toBe(value);
    });
    (0, vitest_1.it)("should return null if all fail", async () => {
        const cacheKey = faker_1.faker.string.alpha(10);
        const namespace = faker_1.faker.string.alpha(5);
        const value = faker_1.faker.string.alpha(10);
        await allFaultyLevelsCacheService.set(cacheKey, value, 3600, namespace);
        await allFaultyLevelsVersionedCacheService.set(cacheKey, value, 3600, namespace);
        (0, vitest_1.expect)(await allFaultyLevelsCacheService.get(cacheKey, undefined, 3600, namespace)).toBe(null);
        (0, vitest_1.expect)(await allFaultyLevelsVersionedCacheService.get(cacheKey, undefined, 3600, namespace)).toBe(null);
    });
    (0, vitest_1.it)("should throw an error if setting/getting with no levels", async () => {
        const noLevelsCacheService = new _1.CacheService({
            levels: [],
            versioning: true,
        });
        const cacheKey = faker_1.faker.string.alpha(10);
        const namespace = faker_1.faker.string.alpha(5);
        const value = faker_1.faker.string.alpha(10);
        await (0, vitest_1.expect)(noLevelsCacheService.set(cacheKey, value, 3600, namespace)).rejects.toThrowError("set: Failed to find first cache level");
        await (0, vitest_1.expect)(noLevelsCacheService.get(cacheKey, undefined, 3600, namespace)).rejects.toThrowError("set: Failed to find first cache level");
    });
    (0, vitest_1.it)("should gracefully handle errors in del for non-versioned cache", async () => {
        const erroringLevel = {
            del: vitest_1.vi.fn().mockImplementation(() => {
                throw new Error("del error");
            }),
            set: vitest_1.vi.fn(),
            get: vitest_1.vi.fn(),
        };
        const service = new _1.CacheService({ levels: [erroringLevel] });
        await (0, vitest_1.expect)(service.del("key")).resolves.toBeUndefined();
        (0, vitest_1.expect)(erroringLevel.del).toHaveBeenCalledWith("key");
    });
    (0, vitest_1.it)("should gracefully handle errors in del for versioned cache", async () => {
        const erroringLevel = {
            del: vitest_1.vi.fn().mockImplementation(() => {
                throw new Error("del error");
            }),
            set: vitest_1.vi.fn().mockImplementation(() => {
                throw new Error("set error");
            }),
            get: vitest_1.vi.fn(),
        };
        vitest_1.vi.spyOn(version_manager_1.VersionManager.prototype, "setWithVersion").mockImplementationOnce(() => {
            throw new Error("set error");
        });
        const service = new _1.CacheService({
            levels: [erroringLevel],
            versioning: true,
        });
        const warnSpy = vitest_1.vi.spyOn(console, "warn").mockImplementation((contents) => {
            console.info(contents);
        });
        await service.set("test", "test123");
        (0, vitest_1.expect)(warnSpy).toHaveBeenCalledWith("Failed to setWithVersion, gracefully continuing with next level.", new Error("set error"));
        warnSpy.mockRestore();
        await (0, vitest_1.expect)(service.del("key")).resolves.toBeUndefined();
        (0, vitest_1.expect)(erroringLevel.del).toHaveBeenCalledWith("key:1");
    });
});
//# sourceMappingURL=cache.service.spec.js.map