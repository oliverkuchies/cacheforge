import { describe, expect, it } from "vitest";
import { MemoryCacheLevel, type StoredHeapItem } from "../levels";
import { FirstExpiringMemoryPolicy } from "../policies/first-expiring-memory.policy";
import { MemoryPercentageLimitStrategy } from "./memory-percentage-limit.strategy";

describe("MemoryPercentageLimitStrategy will ensure memory usage is within limits", () => {
	it("should trigger eviction when memory usage does not exceed threshold", async () => {
		const policy = new FirstExpiringMemoryPolicy();
		const strategy = new MemoryPercentageLimitStrategy<StoredHeapItem>(80);
		const cacheEngine = new MemoryCacheLevel({
			memoryStrategies: [strategy],
			evictionPolicy: policy,
		});
		const snapshotSize = cacheEngine.getHeap().getCount();

		expect(strategy.checkCondition(cacheEngine)).toBe(false);

		await policy.evict(cacheEngine);

		// The heap size should remain unchanged
		const heapSnapshot = cacheEngine.getHeap().getSnapshot();
		expect(heapSnapshot.length).toBe(snapshotSize);
	});

	it("should trigger eviction when memory usage exceeds threshold", async () => {
		const policy = new FirstExpiringMemoryPolicy();
		const strategy = new MemoryPercentageLimitStrategy<StoredHeapItem>(0);
		const cacheEngine = new MemoryCacheLevel({
			memoryStrategies: [strategy],
			evictionPolicy: policy,
		});

		expect(strategy.checkCondition(cacheEngine)).toBe(true);

		await policy.evict(cacheEngine);

		// The heap should be empty after eviction
		const heapSnapshot = cacheEngine.getHeap().getSnapshot();
		expect(heapSnapshot.length).toBe(0);
	});
});
