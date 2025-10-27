"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const faker_1 = require("@faker-js/faker");
const redis_1 = require("@testcontainers/redis");
const ioredis_1 = require("ioredis");
const vitest_1 = require("vitest");
const redis_level_1 = require("./redis.level");
let redisContainer;
let redisCache;
let client;
(0, vitest_1.describe)("RedisCacheLevel (single node)", () => {
    (0, vitest_1.beforeAll)(async () => {
        redisContainer = await new redis_1.RedisContainer("redis:7.2").start();
        client = new ioredis_1.Redis(redisContainer.getConnectionUrl());
        redisCache = new redis_level_1.RedisCacheLevel(client);
    });
    (0, vitest_1.afterAll)(async () => {
        await client?.disconnect();
        await redisContainer?.stop();
    });
    (0, vitest_1.it)("connection should be established", async () => {
        await client.set("key", "val");
        (0, vitest_1.expect)(await client.get("key")).toBe("val");
    });
    (0, vitest_1.it)("should store & retrieve strings", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.string.alpha(10);
        await redisCache.set(testKey, testValue);
        const retrievedValue = await redisCache.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
    });
    (0, vitest_1.it)("should store & retrieve integers", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.number.int();
        await redisCache.set(testKey, testValue);
        const retrievedValue = await redisCache.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
    });
    (0, vitest_1.it)("should allow integer keys", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.string.alpha(10);
        await redisCache.set(testKey, testValue);
        const retrievedValue = await redisCache.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
    });
    (0, vitest_1.it)("should allow object based structures", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.helpers.objectValue({
            name: faker_1.faker.person.firstName(),
            age: faker_1.faker.number.int({ min: 1, max: 100 }),
            address: {
                street: faker_1.faker.location.streetAddress(),
                city: faker_1.faker.location.city(),
                zip: faker_1.faker.location.zipCode(),
            },
            hobbies: faker_1.faker.helpers.arrayElements(["reading", "gaming", "hiking", "coding", "cooking"], 3),
        });
        await redisCache.set(testKey, testValue);
        const retrievedValue = await redisCache.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
    });
    (0, vitest_1.it)("should allow array based structures", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.helpers.arrayElements([
            faker_1.faker.number.int(),
            faker_1.faker.helpers.objectValue({
                type: "date",
                color: "brown",
            }),
            faker_1.faker.string.alpha(5),
        ], 3);
        await redisCache.set(testKey, testValue);
        const retrievedValue = await redisCache.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
    });
    (0, vitest_1.it)("should store & retrieve international characters", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.fakerZH_TW.lorem.words(5);
        await redisCache.set(testKey, testValue);
        const retrievedValue = await redisCache.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
    });
    (0, vitest_1.it)("should handle TTL expiration correctly", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.string.alpha(10);
        const ttl = 2;
        await redisCache.set(testKey, testValue, ttl);
        const retrievedValueBeforeExpiry = await redisCache.get(testKey);
        (0, vitest_1.expect)(retrievedValueBeforeExpiry).toEqual(testValue);
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const retrievedValueAfterExpiry = await redisCache.get(testKey);
        (0, vitest_1.expect)(retrievedValueAfterExpiry).toBeUndefined();
    });
    (0, vitest_1.it)("should lock and unlock keys correctly", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        let lockAcquired = false;
        const result = await redisCache.lock(testKey, async () => {
            lockAcquired = true;
            return 42;
        }, 5);
        (0, vitest_1.expect)(lockAcquired).toBe(true);
        (0, vitest_1.expect)(result).toBe(42);
    });
    (0, vitest_1.it)("should execute closure to get value if key is missing", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.number.int();
        const retrievedValue = await redisCache.get(testKey, async () => {
            return testValue;
        });
        (0, vitest_1.expect)(retrievedValue).toBe(testValue);
        const cachedValue = await redisCache.get(testKey);
        (0, vitest_1.expect)(cachedValue).toBe(testValue);
    });
    (0, vitest_1.it)("should handle key deletion correctly", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.string.alpha(10);
        await redisCache.set(testKey, testValue);
        const retrievedValue = await redisCache.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
        await redisCache.del(testKey);
        const valueAfterDeletion = await redisCache.get(testKey);
        (0, vitest_1.expect)(valueAfterDeletion).toBeUndefined();
    });
    (0, vitest_1.it)("should execute closure to get value if key is missing", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.number.int();
        const retrievedValue = await redisCache.get(testKey, async () => {
            return testValue;
        });
        (0, vitest_1.expect)(retrievedValue).toBe(testValue);
        const cachedValue = await redisCache.get(testKey);
        (0, vitest_1.expect)(cachedValue).toBe(testValue);
    });
});
//# sourceMappingURL=redis.level.spec.js.map