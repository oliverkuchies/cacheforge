import { describe, expect, it } from "vitest";
import { MemoryCacheLevel, type StoredHeapItem } from "../levels";
import { FirstExpiringMemoryPolicy } from "../policies/first-expiring-memory.policy";
import { MemorySizeLimitStrategy } from "./memory-size-limit.strategy";
import { generateJSONData } from "../../tests/utilities/data.utilities";

describe("MemorySizeLimitStrategy will ensure memory usage is within limits", () => {
	it("should not clear memory when memory usage does not exceed threshold", async () => {
		const policy = new FirstExpiringMemoryPolicy();
		const strategy = new MemorySizeLimitStrategy<StoredHeapItem>(0.01);
		const cacheEngine = new MemoryCacheLevel({
			memoryStrategies: [strategy],
			evictionPolicy: policy,
		});
		
		const heapSize = cacheEngine.getHeap().getTotalSize();

		expect(heapSize).toBe(0);	

		expect(strategy.checkCondition(cacheEngine)).toBe(false);

		await policy.evict(cacheEngine);

		// The heap size should remain unchanged because no eviction is needed
		const heapSnapshot = cacheEngine.getHeap().getSnapshot();
		expect(heapSnapshot.length).toBe(heapSize);
	});

	it("should trigger eviction when memory usage exceeds threshold", async () => {
		const policy = new FirstExpiringMemoryPolicy();
		const strategy = new MemorySizeLimitStrategy<StoredHeapItem>(0);
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

	it("should evict items when memory usage exceeds threshold after adding bulk data", async () => {
		const policy = new FirstExpiringMemoryPolicy();
		const strategy = new MemorySizeLimitStrategy<StoredHeapItem>(1);
		const cacheEngine = new MemoryCacheLevel({
			memoryStrategies: [strategy],
			evictionPolicy: policy,
		});		
		
		await generateJSONData(cacheEngine, 10000);

		const postEvictionSnapshot = cacheEngine.getHeap().getSnapshot();

		expect(postEvictionSnapshot.length).toBeLessThan(10000);
	});

	it('should not evict items when memory usage is within threshold after adding bulk data', async () => {
		const policy = new FirstExpiringMemoryPolicy();
		const strategy = new MemorySizeLimitStrategy<StoredHeapItem>(50);
		const cacheEngine = new MemoryCacheLevel({
			memoryStrategies: [strategy],
			evictionPolicy: policy,
		});		
		
		await generateJSONData(cacheEngine, 1000);

		const postEvictionSnapshot = cacheEngine.getHeap().getSnapshot();

		expect(postEvictionSnapshot.length).toBe(1000);
	});
});
