import { faker } from "@faker-js/faker";
import { RedisContainer } from "@testcontainers/redis";
import Redis from "ioredis";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CacheService } from "./";
import {
	MemoryCacheLevel,
	RedisCacheLevel,
	type StoredHeapItem,
} from "./levels";
import { FirstExpiringMemoryPolicy } from "./policies/first-expiring-memory.policy";
import { MemoryPercentageLimitStrategy } from "./strategies/memory-percentage-limit.strategy";

let redisContainer: any;
let redisCache: RedisCacheLevel;
let memoryLevel: MemoryCacheLevel;
let client: Redis;
let cacheService: CacheService;
let versionedCacheService: CacheService;

describe("Cache Service with multiple levels and versioning", () => {
	beforeAll(async () => {
		redisContainer = await new RedisContainer("redis:7.2").start();
		client = new Redis(redisContainer.getConnectionUrl());
		redisCache = new RedisCacheLevel(client);

		const evictionPolicy = new FirstExpiringMemoryPolicy();
		const memoryStrategy = new MemoryPercentageLimitStrategy<StoredHeapItem>(
			70,
		);
		memoryLevel = new MemoryCacheLevel({
			memoryStrategies: [memoryStrategy],
			evictionPolicy: evictionPolicy,
		});

		cacheService = new CacheService({
			levels: [memoryLevel, redisCache],
		});

		versionedCacheService = new CacheService({
			levels: [memoryLevel, redisCache],
			versioning: true,
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
		const versionedCacheKey = `${cacheKey}:v1`;
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
	});

	it("should delete versioned data from all cache levels", async () => {
		const spiedMemoryDel = vi.spyOn(memoryLevel, "del");
		const spiedRedisDel = vi.spyOn(redisCache, "del");

		const cacheKey = faker.string.alpha(10);
		const value = faker.string.alpha(10);
		await versionedCacheService.set(cacheKey, value);
		await versionedCacheService.del(cacheKey);
		expect(spiedMemoryDel).toHaveBeenCalledWith(`${cacheKey}:v1`);
		expect(spiedRedisDel).toHaveBeenCalledWith(`${cacheKey}:v1`);

		const memoryValue = await memoryLevel.get(`${cacheKey}:v1`);
		const redisValue = await redisCache.get(`${cacheKey}:v1`);
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
});
