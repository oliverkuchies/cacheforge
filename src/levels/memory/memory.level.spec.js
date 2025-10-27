"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const faker_1 = require("@faker-js/faker");
const vitest_1 = require("vitest");
const data_utilities_1 = require("../../../tests/utilities/data.utilities");
const policies_1 = require("../../policies");
const memory_percentage_limit_strategy_1 = require("../../strategies/memory-percentage-limit.strategy");
const __1 = require("..");
const evictionPolicy = new policies_1.FirstExpiringMemoryPolicy();
const strategy = new memory_percentage_limit_strategy_1.MemoryPercentageLimitStrategy(80);
const cacheEngine = new __1.MemoryCacheLevel({
    memoryStrategies: [strategy],
    evictionPolicy: evictionPolicy,
});
(0, vitest_1.describe)("should successfully store data, and retrieve it on demand", async () => {
    (0, vitest_1.afterEach)(() => {
        cacheEngine.purge();
    });
    (0, vitest_1.it)("should store & retrieve strings", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.string.alpha(10);
        await cacheEngine.set(testKey, testValue);
        const retrievedValue = await cacheEngine.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
    });
    (0, vitest_1.it)("should store & retrieve integers", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.number.int();
        await cacheEngine.set(testKey, testValue);
        const retrievedValue = await cacheEngine.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
    });
    (0, vitest_1.it)("should allow integer keys", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.string.alpha(10);
        await cacheEngine.set(testKey, testValue);
        const retrievedValue = await cacheEngine.get(testKey);
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
        await cacheEngine.set(testKey, testValue);
        const retrievedValue = await cacheEngine.get(testKey);
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
        await cacheEngine.set(testKey, testValue);
        const retrievedValue = await cacheEngine.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
    });
    (0, vitest_1.it)("should store & retrieve international characters", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.fakerZH_TW.lorem.words(5);
        await cacheEngine.set(testKey, testValue);
        const retrievedValue = await cacheEngine.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
    });
});
(0, vitest_1.describe)("It should successfully manage the application memory usage", () => {
    (0, vitest_1.it)("should return a number representing memory usage", () => {
        const memoryUsage = cacheEngine.getMemoryUsage();
        (0, vitest_1.expect)(typeof memoryUsage).toBe("number");
        (0, vitest_1.expect)(memoryUsage).toBeGreaterThan(0);
    });
    (0, vitest_1.it)("should have reasonable execution time for insertions", async () => {
        const start = Date.now();
        const end = Date.now();
        const executionTime = end - start;
        (0, vitest_1.expect)(executionTime).toBeLessThan(5);
        const INSERT_AMOUNT = 10000;
        // Initial insertions
        await (0, data_utilities_1.generateJSONData)(cacheEngine, INSERT_AMOUNT);
        const startLarge = Date.now();
        const endLarge = Date.now();
        const executionTimeLarge = endLarge - startLarge;
        // each insertion should take less than 1 microsecond on average
        (0, vitest_1.expect)(executionTimeLarge / INSERT_AMOUNT).toBeLessThan(1);
    });
    (0, vitest_1.it)("should run get operations with fallback async function if cache miss occurs", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.string.alpha(20);
        const fallbackFunction = async () => {
            return testValue;
        };
        const retrievedValue = await cacheEngine.get(testKey, fallbackFunction);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
    });
    (0, vitest_1.it)("should run get operations with fallback direct value if cache miss occurs", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const testValue = faker_1.faker.string.alpha(20);
        const retrievedValue = await cacheEngine.get(testKey, testValue);
        (0, vitest_1.expect)(retrievedValue).toEqual(testValue);
    });
    (0, vitest_1.it)("should return undefined if no fallback provided and cache miss occurs", async () => {
        const testKey = faker_1.faker.string.alpha(10);
        const retrievedValue = await cacheEngine.get(testKey);
        (0, vitest_1.expect)(retrievedValue).toBeUndefined();
    });
});
//# sourceMappingURL=memory.level.spec.js.map