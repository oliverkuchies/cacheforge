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
let redisCache: RedisCacheLevel;
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
		redisCache = new RedisCacheLevel(client);

		cacheService = new CacheService({
			levels: [memoryLevel, redisCache],
		});

		versionedCacheService = new CacheService({
			levels: [memoryLevel, redisCache],
			versioning: true,
		});

		faultyFirstLevelVersionedCacheService = new CacheService({
			levels: [faultyMemoryLevel, redisCache],
			versioning: true,
		});

		faultyFirstLevelCacheService = new CacheService({
			levels: [faultyMemoryLevel, redisCache],
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

		const redisValue = await redisCache.get(cacheKey);

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

		const redisValue = await redisCache.get(versionedCacheKey);

		expect(redisValue, "Redis cache should return the correct value").toBe(
			value,
		);

		const memoryValue = await memoryLevel.get(versionedCacheKey);

		expect(memoryValue, "Memory cache should return the correct value").toBe(
			value,
		);

		const cacheServiceValue = await versionedCacheService.get(cacheKey);

		expect(
			cacheServiceValue,
			"Versioned Cache Service should return the correct value",
		).toBe(value);

		// Now we will invalidate, and it should be undefined
		await versionedCacheService.invalidateKey(cacheKey);
		expect(await versionedCacheService.get(cacheKey)).toBe(null);
	});

	it("should delete versioned data from all cache levels", async () => {
		const spiedMemoryDel = vi.spyOn(memoryLevel, "del");
		const spiedRedisDel = vi.spyOn(redisCache, "del");

		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);
		await versionedCacheService.set(cacheKey, value);
		await versionedCacheService.del(cacheKey);
		expect(spiedMemoryDel).toHaveBeenCalledWith(`${cacheKey}:1`);
		expect(spiedRedisDel).toHaveBeenCalledWith(`${cacheKey}:1`);

		const memoryValue = await memoryLevel.get(`${cacheKey}:1`);
		const redisValue = await redisCache.get(`${cacheKey}:1`);
		expect(memoryValue).toBeUndefined();
		expect(redisValue).toBeUndefined();
	});

	it("should get data from the highest cache level available", async () => {
		const spiedMemoryService = vi.spyOn(memoryLevel, "get");
		const spiedRedisService = vi.spyOn(redisCache, "get");

		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);

		await cacheService.set(cacheKey, value);

		const retrievedValue = await cacheService.get<string>(cacheKey);

		expect(
			retrievedValue,
			"Retrieved value should match the original value",
		).toBe(value);
		expect(spiedMemoryService).toHaveBeenCalledTimes(1);
		expect(spiedRedisService).not.toHaveBeenCalled();
	});

	it("should delete data from all cache levels", async () => {
		const spiedMemoryDel = vi.spyOn(memoryLevel, "del");
		const spiedRedisDel = vi.spyOn(redisCache, "del");

		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);
		await cacheService.set(cacheKey, value);

		await cacheService.del(cacheKey);

		expect(spiedMemoryDel).toHaveBeenCalledWith(cacheKey);
		expect(spiedRedisDel).toHaveBeenCalledWith(cacheKey);

		const memoryValue = await memoryLevel.get(cacheKey);
		const redisValue = await redisCache.get(cacheKey);

		expect(memoryValue).toBeUndefined();
		expect(redisValue).toBeUndefined();
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

		const retrievedValue = await cacheService.get<string>(cacheKey);
		expect(retrievedValue).toBeNull();
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

		const cachedValue = await cacheService.get<number>(testKey);
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
		expect(mockedMemoryGet).toHaveBeenCalledWith(
			`${namespace}:version`,
			1,
			604800,
		);
		// Great, the version is now 1.
		// Lets use this to set the value of our cache key
		expect(mockedMemorySet).toHaveBeenCalledWith(`${cacheKey}:1`, value, 3600);

		expect(
			await versionedCacheService.get(cacheKey, undefined, 3600, namespace),
		).toBe(value);
	});

	it("should return the values from redis if memory fails in versioned cache", async () => {
		const mockedRedisSet = vi.spyOn(redisCache, "set");
		const mockedRedisGet = vi.spyOn(redisCache, "get");
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
				undefined,
				3600,
				namespace,
			),
		).toBe(value);

		await faultyFirstLevelVersionedCacheService.del(cacheKey, namespace);
		expect(faultyMemoryDel).toBeCalled();
		expect(
			await faultyFirstLevelVersionedCacheService.get(
				cacheKey,
				undefined,
				3600,
				namespace,
			),
		).toBe(null);
	});

	it("should return the values from redis if memory fails in non-versioned cache", async () => {
		const mockedRedisSet = vi.spyOn(redisCache, "set");
		const mockedRedisGet = vi.spyOn(redisCache, "get");
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
			await allFaultyLevelsCacheService.get(
				cacheKey,
				undefined,
				3600,
				namespace,
			),
		).toBe(null);
		expect(
			await allFaultyLevelsVersionedCacheService.get(
				cacheKey,
				undefined,
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
		const erroringLevel = {
			del: vi.fn().mockImplementation(() => {
				throw new Error("del error");
			}),
			set: vi.fn(),
			get: vi.fn(),
		};
		const service = new CacheService({ levels: [erroringLevel] });
		await expect(service.del("key")).resolves.toBeUndefined();
		expect(erroringLevel.del).toHaveBeenCalledWith("key");
	});

	it("should gracefully handle errors in del for versioned cache", async () => {
		const erroringLevel = {
			del: vi.fn().mockImplementation(() => {
				throw new Error("del error");
			}),
			set: vi.fn().mockImplementation(() => {
				throw new Error("set error");
			}),
			get: vi.fn(),
		};
		vi.spyOn(VersionManager.prototype, "setWithVersion").mockImplementationOnce(
			() => {
				throw new Error("set error");
			},
		);

		const service = new CacheService({
			levels: [erroringLevel],
			versioning: true,
		});
		const warnSpy = vi.spyOn(console, "warn").mockImplementation((contents) => {
			console.info(contents);
		});

		await service.set("test", "test123");

		expect(warnSpy).toHaveBeenCalledWith(
			"Failed to setWithVersion, gracefully continuing with next level.",
			new Error("set error"),
		);
		warnSpy.mockRestore();

		await expect(service.del("key")).resolves.toBeUndefined();
		expect(erroringLevel.del).toHaveBeenCalledWith("key:1");
	});

	it("should backfill higher cache levels when a lower level has the data", async () => {
		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);

		// Directly set the value in the Redis level (lower level)
		await redisCache.set(`${cacheKey}:1`, value, 3600);

		// Now attempt to get the value via the versioned cache service
		const retrievedValue = await versionedCacheService.get<string>(cacheKey);

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
});
