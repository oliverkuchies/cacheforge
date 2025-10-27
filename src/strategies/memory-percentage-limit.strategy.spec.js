"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const levels_1 = require("../levels");
const first_expiring_memory_policy_1 = require("../policies/first-expiring-memory.policy");
const memory_percentage_limit_strategy_1 = require("./memory-percentage-limit.strategy");
(0, vitest_1.describe)("MemoryPercentageLimitStrategy will ensure memory usage is within limits", () => {
    (0, vitest_1.it)("should trigger eviction when memory usage does not exceed threshold", async () => {
        const policy = new first_expiring_memory_policy_1.FirstExpiringMemoryPolicy();
        const strategy = new memory_percentage_limit_strategy_1.MemoryPercentageLimitStrategy(80);
        const cacheEngine = new levels_1.MemoryCacheLevel({
            memoryStrategies: [strategy],
            evictionPolicy: policy,
        });
        const snapshotSize = cacheEngine.getHeap().getCount();
        (0, vitest_1.expect)(strategy.checkCondition(cacheEngine)).toBe(false);
        await policy.evict(cacheEngine);
        // The heap size should remain unchanged
        const heapSnapshot = cacheEngine.getHeap().getSnapshot();
        (0, vitest_1.expect)(heapSnapshot.length).toBe(snapshotSize);
    });
    (0, vitest_1.it)("should trigger eviction when memory usage exceeds threshold", async () => {
        const policy = new first_expiring_memory_policy_1.FirstExpiringMemoryPolicy();
        const strategy = new memory_percentage_limit_strategy_1.MemoryPercentageLimitStrategy(0);
        const cacheEngine = new levels_1.MemoryCacheLevel({
            memoryStrategies: [strategy],
            evictionPolicy: policy,
        });
        (0, vitest_1.expect)(strategy.checkCondition(cacheEngine)).toBe(true);
        await policy.evict(cacheEngine);
        // The heap should be empty after eviction
        const heapSnapshot = cacheEngine.getHeap().getSnapshot();
        (0, vitest_1.expect)(heapSnapshot.length).toBe(0);
    });
});
//# sourceMappingURL=memory-percentage-limit.strategy.spec.js.map