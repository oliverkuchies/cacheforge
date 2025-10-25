import { faker } from "@faker-js/faker";
import { describe, it, expect, beforeAll } from "vitest";
import { RedisCacheLevel } from "../../levels";
import Redis from "ioredis";
import { RedisContainer } from "@testcontainers/redis";
import { VersionManager } from "../version-manager";
import { generateVersionLookupKey } from "../../utils/version.utils";

let redisContainer: any;
let redisCache: RedisCacheLevel;
let client: Redis;


describe('Versioning Interface', () => {
    beforeAll(async () => {
        redisContainer = await new RedisContainer('redis:7.2').start();
        client = new Redis(redisContainer.getConnectionUrl());
        redisCache = new RedisCacheLevel(client);
    });

    it('should increment version on invalidate', async () => {
        const testKey = faker.string.alpha(10);
        const versionManager = new VersionManager(redisCache);
        const version = await versionManager.getCurrentVersion(testKey);
        expect(version).toBe(1);

        await versionManager.invalidate(testKey);
        const newVersion = await versionManager.getCurrentVersion(testKey);
        expect(newVersion).toBe(2);
    });

    it('should store and retrieve versioned keys', async () => {
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
