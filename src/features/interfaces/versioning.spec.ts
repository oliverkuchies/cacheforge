import { faker } from "@faker-js/faker";
import { RedisContainer } from "@testcontainers/redis";
import Redis from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { RedisCacheLevel } from "../../levels";
import { generateVersionLookupKey } from "../../utils/version.utils";
import { VersionManager } from "../version-manager";

let redisContainer: any;
let redisCache: RedisCacheLevel;
let client: Redis;

describe("Versioning Interface", () => {
	beforeAll(async () => {
		redisContainer = await new RedisContainer("redis:7.2").start();
		client = new Redis(redisContainer.getConnectionUrl());
		redisCache = new RedisCacheLevel(client);
	});

	afterAll(async () => {
		await client.disconnect();
		await redisContainer.stop();
	});

	it("should increment version on invalidate", async () => {
		const testKey = faker.string.alpha(10);
		const versionManager = new VersionManager(redisCache);
		const version = await versionManager.getCurrentVersion(testKey);
		expect(version).toBe(1);

		await versionManager.invalidate(testKey);
		const newVersion = await versionManager.getCurrentVersion(testKey);
		expect(newVersion).toBe(2);
	});

	it("should store and retrieve versioned keys", async () => {
		const testKey = faker.string.alpha(10);
		const testValue = faker.string.alpha(10);
		const versionManager = new VersionManager(redisCache);

		await versionManager.set(testKey, testValue);
		const retrievedValue = await versionManager.get<string>(testKey);
		expect(retrievedValue).toBe(testValue);

		await versionManager.invalidate(testKey);
		const newRetrievedValue = await versionManager.get<string>(testKey);
		expect(newRetrievedValue).toBe(undefined);
	});
});
