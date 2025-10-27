"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const faker_1 = require("@faker-js/faker");
const redis_1 = require("@testcontainers/redis");
const ioredis_1 = __importDefault(require("ioredis"));
const vitest_1 = require("vitest");
const levels_1 = require("../../levels");
const version_manager_1 = require("../version-manager");
let redisContainer;
let redisCache;
let client;
(0, vitest_1.describe)("Versioning Interface", () => {
    (0, vitest_1.beforeAll)(async () => {
        redisContainer = await new redis_1.RedisContainer("redis:7.2").start();
        client = new ioredis_1.default(redisContainer.getConnectionUrl());
        redisCache = new levels_1.RedisCacheLevel(client);
    });
    (0, vitest_1.afterAll)(async () => {
        await client.disconnect();
        await redisContainer.stop();
    });
    (0, vitest_1.it)("should increment version on invalidate", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const versionManager = new version_manager_1.VersionManager(redisCache);
        const version = await versionManager.getCurrentVersion(testKey);
        (0, vitest_1.expect)(version).toBe(1);
        await versionManager.invalidate(testKey);
        const newVersion = await versionManager.getCurrentVersion(testKey);
        (0, vitest_1.expect)(newVersion).toBe(2);
    });
    (0, vitest_1.it)("should store and retrieve versioned keys", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.string.alpha(10);
        const versionManager = new version_manager_1.VersionManager(redisCache);
        const version = await versionManager.set(testKey, testValue);
        (0, vitest_1.expect)(version).toBe("1");
        const retrievedValue = await versionManager.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toBe(testValue);
        await versionManager.invalidate(testKey);
        const newRetrievedValue = await versionManager.get(testKey);
        (0, vitest_1.expect)(newRetrievedValue).toBe(undefined);
    });
});
//# sourceMappingURL=versioning.spec.js.map