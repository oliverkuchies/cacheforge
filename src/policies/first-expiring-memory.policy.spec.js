"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const data_utilities_1 = require("../../tests/utilities/data.utilities");
const levels_1 = require("../levels");
const memory_percentage_limit_strategy_1 = require("../strategies/memory-percentage-limit.strategy");
const first_expiring_memory_policy_1 = require("./first-expiring-memory.policy");
const policy = new first_expiring_memory_policy_1.FirstExpiringMemoryPolicy();
const strategy = new memory_percentage_limit_strategy_1.MemoryPercentageLimitStrategy(80);
const cacheEngine = new levels_1.MemoryCacheLevel({
    memoryStrategies: [strategy],
    evictionPolicy: policy,
});
(0, vitest_1.describe)("First Expiring Memory Policy", () => {
    (0, vitest_1.afterEach)(() => {
        cacheEngine.purge();
    });
    (0, vitest_1.it)("should evict x amount of items from memory", async () => {
        await (0, data_utilities_1.generateJSONData)(cacheEngine, 1000);
        (0, vitest_1.expect)(cacheEngine.getHeap().getCount()).toEqual(1000);
        const policy = new first_expiring_memory_policy_1.FirstExpiringMemoryPolicy();
        await policy.evict(cacheEngine);
        (0, vitest_1.expect)(cacheEngine.getHeap().getCount()).toEqual(1000 - 0.1 * 1000);
    });
    (0, vitest_1.it)("should evict way too much to see how system handles it", async () => {
        await (0, data_utilities_1.generateJSONData)(cacheEngine, 1000);
        (0, vitest_1.expect)(cacheEngine.getHeap().getCount()).toEqual(1000);
        const policy = new first_expiring_memory_policy_1.FirstExpiringMemoryPolicy();
        for (let i = 0; i <= 10000; i++) {
            await policy.evict(cacheEngine);
        }
        (0, vitest_1.expect)(cacheEngine.getHeap().getCount()).toEqual(0);
    });
});
//# sourceMappingURL=first-expiring-memory.policy.spec.js.map