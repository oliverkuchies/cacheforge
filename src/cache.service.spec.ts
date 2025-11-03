import { faker } from "@faker-js/faker";
import {
	RedisContainer,
	type StartedRedisContainer,
} from "@testcontainers/redis";
import Redis from "ioredis";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CacheService } from "./";
import { VersionManager } from "./features/version-manager";
import {
	MemoryCacheLevel,
	RedisCacheLevel,
	type StoredHeapItem,
} from "./levels";
import { FirstExpiringMemoryPolicy } from "./policies/first-expiring-memory.policy";
import { MemoryPercentageLimitStrategy } from "./strategies/memory-percentage-limit.strategy";

let redisContainer: StartedRedisContainer;
let redisLevel: RedisCacheLevel;
let memoryLevel: MemoryCacheLevel;
let client: Redis;
let cacheService: CacheService;
let versionedCacheService: CacheService;
let faultyFirstLevelVersionedCacheService: CacheService;
let faultyFirstLevelCacheService: CacheService;
let allFaultyLevelsCacheService: CacheService;
let allFaultyLevelsVersionedCacheService: CacheService;
const memoryStrategy = new MemoryPercentageLimitStrategy<StoredHeapItem>(70);
const evictionPolicy = new FirstExpiringMemoryPolicy();
memoryLevel = new MemoryCacheLevel({
	memoryStrategies: [memoryStrategy],
	evictionPolicy: evictionPolicy,
});
const faultyMemoryLevel = new MemoryCacheLevel({
	memoryStrategies: [memoryStrategy],
	evictionPolicy: evictionPolicy,
});

const faultyMemoryGet = vi
	.spyOn(faultyMemoryLevel, "get")
	.mockImplementation(() => {
		throw new Error("Faulty Memory Level, failed to get");
	});

const faultyMemorySet = vi
	.spyOn(faultyMemoryLevel, "set")
	.mockImplementation(() => {
		throw new Error("Faulty Memory Level, failed to set");
	});

const faultyMemoryDel = vi
	.spyOn(faultyMemoryLevel, "del")
	.mockImplementation(() => {
		throw new Error("Faulty Memory Level, failed to delete");
	});

describe("Cache Service with multiple levels and versioning", () => {
	beforeAll(async () => {
		redisContainer = await new RedisContainer("redis:7.2").start();
		client = new Redis(redisContainer.getConnectionUrl());
		redisLevel = new RedisCacheLevel(client);

		cacheService = new CacheService({
			levels: [memoryLevel, redisLevel],
		});

		versionedCacheService = new CacheService({
			levels: [memoryLevel, redisLevel],
			versioning: true,
		});

		faultyFirstLevelVersionedCacheService = new CacheService({
			levels: [faultyMemoryLevel, redisLevel],
			versioning: true,
		});

		faultyFirstLevelCacheService = new CacheService({
			levels: [faultyMemoryLevel, redisLevel],
		});

		allFaultyLevelsVersionedCacheService = new CacheService({
			levels: [faultyMemoryLevel, faultyMemoryLevel],
			versioning: true,
		});

		allFaultyLevelsCacheService = new CacheService({
			levels: [faultyMemoryLevel, faultyMemoryLevel],
		});
	});

	it("should correctly store and retrieve versioned keys across cache levels", async () => {
		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);
		await cacheService.set(cacheKey, value);

		const redisValue = await redisLevel.get(cacheKey);

		expect(redisValue, "Redis cache should return the correct value").toBe(
			value,
		);

		const memoryValue = await memoryLevel.get(cacheKey);

		expect(memoryValue, "Memory cache should return the correct value").toBe(
			value,
		);
	});

	it("should correctly store and retrieve versioned keys across cache levels- versioned", async () => {
		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);
		const versionedCacheKey = `${cacheKey}:1`;
		await versionedCacheService.set(cacheKey, value);

		const redisValue = await redisLevel.get(versionedCacheKey);

		expect(redisValue, "Redis cache should return the correct value").toBe(
			value,
		);

		const memoryValue = await memoryLevel.get(versionedCacheKey);

		expect(memoryValue, "Memory cache should return the correct value").toBe(
			value,
		);

		const cacheServiceValue = await versionedCacheService.get(cacheKey, null);

		expect(
			cacheServiceValue,
			"Versioned Cache Service should return the correct value",
		).toBe(value);

		// Now we will invalidate, and it should be undefined
		await versionedCacheService.invalidateKey(cacheKey);
		expect(await versionedCacheService.get(cacheKey, null)).toBe(null);
	});

	it("should delete versioned data from all cache levels", async () => {
		const spiedMemoryDel = vi.spyOn(memoryLevel, "del");
		const spiedRedisDel = vi.spyOn(redisLevel, "del");

		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);
		await versionedCacheService.set(cacheKey, value);
		await versionedCacheService.del(cacheKey);
		expect(spiedMemoryDel).toHaveBeenCalledWith(`${cacheKey}:1`);
		expect(spiedRedisDel).toHaveBeenCalledWith(`${cacheKey}:1`);

		const memoryValue = await memoryLevel.get(`${cacheKey}:1`);
		const redisValue = await redisLevel.get(`${cacheKey}:1`);
		expect(memoryValue).toBeUndefined();
		expect(redisValue).toBeNull();
	});

	it("should get data from the highest cache level available", async () => {
		const spiedMemoryService = vi.spyOn(memoryLevel, "get");
		const spiedRedisService = vi.spyOn(redisLevel, "get");

		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);

		await cacheService.set(cacheKey, value);

		const retrievedValue = await cacheService.get<string>(cacheKey, "0");

		expect(
			retrievedValue,
			"Retrieved value should match the original value",
		).toBe(value);
		expect(spiedMemoryService).toHaveBeenCalledTimes(1);
		expect(spiedRedisService).not.toHaveBeenCalled();
	});

	it("should delete data from all cache levels", async () => {
		const spiedMemoryDel = vi.spyOn(memoryLevel, "del");
		const spiedRedisDel = vi.spyOn(redisLevel, "del");

		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);
		await cacheService.set(cacheKey, value);

		await cacheService.del(cacheKey);

		expect(spiedMemoryDel).toHaveBeenCalledWith(cacheKey);
		expect(spiedRedisDel).toHaveBeenCalledWith(cacheKey);

		const memoryValue = await memoryLevel.get(cacheKey);
		const redisValue = await redisLevel.get(cacheKey);

		expect(memoryValue).toBeUndefined();
		expect(redisValue).toBeNull();
	});

	it("should lock and unlock keys correctly across cache levels", async () => {
		const cacheKey = faker.string.alpha(10);
		let lockAcquired = false;

		const result = await cacheService.lock<number>(
			cacheKey,
			async () => {
				lockAcquired = true;
				return 99;
			},
			5,
		);

		expect(lockAcquired).toBe(true);
		expect(result).toBe(99);
	});

	it("should return null for non-existent keys", async () => {
		const cacheKey = faker.string.alpha(10);

		const retrievedValue = await cacheService.get<string>(
			cacheKey,
			async () => {
				return Promise.resolve("0");
			},
		);
		expect(retrievedValue).toBe("0");
	});

	it("should throwing a locking exception if all levels do not support locking", async () => {
		const simpleCacheService = new CacheService({
			levels: [memoryLevel],
		});

		const cacheKey = faker.string.alpha(10);
		await expect(
			simpleCacheService.lock<string>(
				cacheKey,
				async () => {
					return "test";
				},
				5,
			),
		).rejects.toThrowError(
			`Locking not supported in the current cache levels.`,
		);
	});

	it("should execute closure to get value if key is missing", async () => {
		const testKey = faker.string.alpha(10);
		const testValue = faker.number.int();

		const retrievedValue = await cacheService.get<number>(testKey, async () => {
			return testValue;
		});

		expect(retrievedValue).toBe(testValue);

		const cachedValue = await cacheService.get<number>(testKey, 0);
		expect(cachedValue).toBe(testValue);
	});

	it("should return correct value for namespaced keys", async () => {
		const mockedMemorySet = vi.spyOn(memoryLevel, "set");
		const mockedMemoryGet = vi.spyOn(memoryLevel, "get");
		const cacheKey = faker.string.alpha(10);
		const namespace = faker.string.alpha(5);
		const value = faker.string.alpha(10);

		await versionedCacheService.set(cacheKey, value, 3600, namespace);

		// The system attempts to receive the version key
		expect(mockedMemoryGet).toHaveBeenCalledWith(`${namespace}:version`);
		// Great, the version is now 1.
		// Lets use this to set the value of our cache key
		expect(mockedMemorySet).toHaveBeenCalledWith(`${cacheKey}:1`, value, 3600);

		expect(
			await versionedCacheService.get(cacheKey, undefined, 3600, namespace),
		).toBe(value);
	});

	it("should return the values from redis if memory fails in versioned cache", async () => {
		const mockedRedisSet = vi.spyOn(redisLevel, "set");
		const mockedRedisGet = vi.spyOn(redisLevel, "get");
		const cacheKey = faker.string.alpha(10);
		const namespace = faker.string.alpha(5);
		const value = faker.string.alpha(10);

		await faultyFirstLevelVersionedCacheService.set(
			cacheKey,
			value,
			3600,
			namespace,
		);

		expect(faultyMemoryGet).toHaveBeenCalled();
		expect(faultyMemorySet).toHaveBeenCalled();
		expect(
			mockedRedisSet,
			"Redis should be called with set",
		).toHaveBeenCalledWith(`${cacheKey}:1`, value, 3600);
		expect(mockedRedisGet).not.toHaveBeenCalled();
		expect(
			await faultyFirstLevelVersionedCacheService.get(
				cacheKey,
				null,
				3600,
				namespace,
			),
		).toBe(value);

		await faultyFirstLevelVersionedCacheService.del(cacheKey, namespace);
		expect(faultyMemoryDel).toBeCalled();
		expect(
			await faultyFirstLevelVersionedCacheService.get(
				cacheKey,
				null,
				3600,
				namespace,
			),
		).toBe(null);
	});

	it("should return the values from redis if memory fails in non-versioned cache", async () => {
		const mockedRedisSet = vi.spyOn(redisLevel, "set");
		const mockedRedisGet = vi.spyOn(redisLevel, "get");
		const cacheKey = faker.string.alpha(10);
		const namespace = faker.string.alpha(5);
		const value = faker.string.alpha(10);

		await faultyFirstLevelCacheService.set(cacheKey, value, 3600, namespace);

		expect(faultyMemoryGet).toHaveBeenCalled();
		expect(faultyMemorySet).toHaveBeenCalled();
		expect(
			mockedRedisSet,
			"Redis should be called with set",
		).toHaveBeenCalledWith(`${cacheKey}`, value, 3600);
		expect(mockedRedisGet).not.toHaveBeenCalled();
		expect(
			await faultyFirstLevelCacheService.get(
				cacheKey,
				undefined,
				3600,
				namespace,
			),
		).toBe(value);
	});

	it("should return null if all fail", async () => {
		const cacheKey = faker.string.alpha(10);
		const namespace = faker.string.alpha(5);
		const value = faker.string.alpha(10);
		await allFaultyLevelsCacheService.set(cacheKey, value, 3600, namespace);
		await allFaultyLevelsVersionedCacheService.set(
			cacheKey,
			value,
			3600,
			namespace,
		);

		expect(
			await allFaultyLevelsCacheService.get(cacheKey, null, 3600, namespace),
		).toBe(null);
		expect(
			await allFaultyLevelsVersionedCacheService.get(
				cacheKey,
				null,
				3600,
				namespace,
			),
		).toBe(null);
	});

	it("should throw an error if setting/getting with no levels", async () => {
		const noLevelsCacheService = new CacheService({
			levels: [],
			versioning: true,
		});
		const cacheKey = faker.string.alpha(10);
		const namespace = faker.string.alpha(5);
		const value = faker.string.alpha(10);
		await expect(
			noLevelsCacheService.set(cacheKey, value, 3600, namespace),
		).rejects.toThrowError("set: Failed to find first cache level");
		await expect(
			noLevelsCacheService.get(cacheKey, undefined, 3600, namespace),
		).rejects.toThrowError("set: Failed to find first cache level");
	});

	it("should gracefully handle errors in del for non-versioned cache", async () => {
		const erroringLevel = new MemoryCacheLevel({
			memoryStrategies: [],
			evictionPolicy: evictionPolicy,
		});
		const delSpy = vi.spyOn(erroringLevel, "del").mockImplementation(() => {
			throw new Error("del error");
		});
		const service = new CacheService({ levels: [erroringLevel] });
		await expect(service.del("key")).resolves.toBeUndefined();
		expect(delSpy).toHaveBeenCalledWith("key");
	});

	it("should gracefully handle errors in del for versioned cache", async () => {
		const erroringLevel = new MemoryCacheLevel({
			memoryStrategies: [],
			evictionPolicy: evictionPolicy,
		});
		const delSpy = vi.spyOn(erroringLevel, "del").mockImplementation(() => {
			throw new Error("del error");
		});
		const _setSpy = vi.spyOn(erroringLevel, "set").mockImplementation(() => {
			throw new Error("set error");
		});
		vi.spyOn(VersionManager.prototype, "setWithVersion").mockImplementationOnce(
			() => {
				throw new Error("set error");
			},
		);
		const service = new CacheService({
			levels: [erroringLevel],
			versioning: true,
		});
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
		await service.set("test", "test123");
		expect(warnSpy).toHaveBeenCalledWith(
			"Failed to setWithVersion, gracefully continuing with next level.",
			new Error("set error"),
		);
		warnSpy.mockRestore();
		await expect(service.del("key")).resolves.toBeUndefined();
		expect(delSpy).toHaveBeenCalledWith("key:1");
	});

	it("should backfill higher cache levels when a lower level has the data", async () => {
		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);

		// Directly set the value in the Redis level (lower level)
		await redisLevel.set(`${cacheKey}:1`, value, 3600);

		// Expect redisLevel to have the value
		expect(await redisLevel.get(`${cacheKey}:1`)).toBe(value);

		// Ensure memory level does not have the value initially
		expect(await memoryLevel.get(`${cacheKey}:1`)).toBeUndefined();

		// Now attempt to get the value via the versioned cache service
		const retrievedValue = await versionedCacheService.get<string>(
			cacheKey,
			"bananas",
		);

		expect(
			retrievedValue,
			"Retrieved value should match the original value from Redis",
		).toBe(value);

		// Now check if the value has been backfilled to the memory level (higher level)
		const memoryValue = await memoryLevel.get(`${cacheKey}:1`);
		expect(
			memoryValue,
			"Memory cache should have been backfilled with the value",
		).toBe(value);
	});

	it("should return callback if there are no levels", async () => {
		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);
		const callback = vi.fn().mockReturnValue(value);

		const result = await new CacheService({
			levels: [],
		}).get(cacheKey, callback);

		expect(result).toBe(value);
		expect(callback).toHaveBeenCalled();
	});
});

describe("get fallback to valueGetter", () => {
	it("should call valueGetter function if all levels miss (non-versioned)", async () => {
		const cache = new CacheService({ levels: [memoryLevel, redisLevel] });
		const result = await cache.get("missing", 0);
		expect(result).toBe(0);
	});

	it("should call valueGetter function if all levels miss (versioned)", async () => {
		const cache = new CacheService({
			levels: [memoryLevel, redisLevel],
			versioning: true,
		});
		const valueGetter = vi.fn().mockResolvedValue("fallback");
		const result = await cache.get("missing", valueGetter);
		expect(valueGetter).toHaveBeenCalled();
		expect(result).toBe("fallback");
	});
});

describe("should handle flushAll across levels", () => {
	it("should flush all levels without error", async () => {
		const cache = new CacheService({ levels: [memoryLevel, redisLevel] });
		await cache.flushAll();
	});

	it("should actually flush levels with data", async () => {
		const cache = new CacheService({ levels: [memoryLevel, redisLevel] });
		const key = faker.string.alpha(10);
		const value = faker.string.alpha(10);
		await cache.set(key, value);

		expect(await cache.get(key, null)).toBe(value);

		await cache.flushAll();

		expect(await cache.get(key, null)).toBe(null);
	});
});

describe("Multi-get and Multi-delete functionality", () => {
	beforeAll(async () => {
		redisContainer = await new RedisContainer("redis:7.2").start();
		client = new Redis(redisContainer.getConnectionUrl());
		redisLevel = new RedisCacheLevel(client);

		cacheService = new CacheService({
			levels: [memoryLevel, redisLevel],
		});
	});

	it("should mget and mdel across multiple levels", async () => {
		const cache = new CacheService({ levels: [memoryLevel, redisLevel] });
		const bingo1 = faker.number.bigInt();
		const bingo2 = faker.number.bigInt();
		const bingo3 = faker.number.bigInt();

		await cache.set("bingo", bingo1);
		await cache.set("bingo1", bingo2);
		await cache.set("bingo2", bingo3);
		const multiValues = await cache.mget(["bingo", "bingo1", "bingo2"]);

		// Compare as strings to handle BigInt/Number serialization differences
		expect(multiValues.map(String)).toEqual(
			[bingo1, bingo2, bingo3].map(String),
		);
		// Now delete them
		await cache.mdel(["bingo", "bingo1", "bingo2"]);

		expect(await cache.mget(["bingo", "bingo1", "bingo2"])).toEqual([
			null,
			null,
			null,
		]);
	});

	it("should retrieve values from redis if memory level misses in mget", async () => {
		const cache = new CacheService({ levels: [memoryLevel, redisLevel] });
		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);

		// Directly set the value in the Redis level (lower level)
		await redisLevel.set(cacheKey, value, 3600);

		// Ensure memory level does not have the value initially
		expect(await memoryLevel.get(cacheKey)).toBeUndefined();

		// Now attempt to mget the value via the cache service
		const retrievedValues = await cache.mget([cacheKey]);

		expect(
			retrievedValues[0],
			"Retrieved value should match the original value from Redis",
		).toBe(value);

		// Now check if the value has been backfilled to the memory level (higher level)
		const memoryValue = await memoryLevel.get(cacheKey);
		expect(
			memoryValue,
			"Memory cache should have been backfilled with the value",
		).toBe(value);
	});
});
