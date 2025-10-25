import { it, describe, expect, vitest } from "vitest";
import { MemoryPercentageLimitStrategy } from "./memory-percentage-limit.strategy";
import { MemoryCacheLevel, StoredHeapItem, StoredItem } from "../levels";
import { FirstExpiringMemoryPolicy } from "../policies/first-expiring-memory.policy";

describe('MemoryPercentageLimitStrategy will ensure memory usage is within limits', () => {
    it('should trigger eviction when memory usage does not exceed threshold', async () => {
        const policy = new FirstExpiringMemoryPolicy();
        const strategy = new MemoryPercentageLimitStrategy<StoredHeapItem>(80, policy);
        const cacheEngine = new MemoryCacheLevel(strategy);
        const snapshotSize = cacheEngine.getHeap().getCount();

        expect(strategy.checkCondition(cacheEngine)).toBe(false);
        
        await strategy.execute(cacheEngine);

        // The heap size should remain unchanged
        const heapSnapshot = cacheEngine.getHeap().getSnapshot();
        expect(heapSnapshot.length).toBe(snapshotSize);
    });

    it('should trigger eviction when memory usage exceeds threshold', async () => {
        const policy = new FirstExpiringMemoryPolicy();
        const strategy = new MemoryPercentageLimitStrategy<StoredHeapItem>(0, policy);
        const cacheEngine = new MemoryCacheLevel(strategy);
        
        expect(strategy.checkCondition(cacheEngine)).toBe(true);

        await strategy.execute(cacheEngine);

        // The heap should be empty after eviction
        const heapSnapshot = cacheEngine.getHeap().getSnapshot();
        expect(heapSnapshot.length).toBe(0);
    });
});