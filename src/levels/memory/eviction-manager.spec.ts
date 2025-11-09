import { beforeEach, describe, expect, it, vi } from "vitest";
import { AbstractMemoryEvictionPolicy } from "../../policies/abstract/abstract-memory-eviction.policy";
import { FirstExpiringMemoryPolicy } from "../../policies/first-expiring-memory.policy";
import { RamPercentageLimitStrategy } from "../../strategies/ram-percentage-limit.strategy";
import { EvictionManager } from "./eviction-manager";
import { MemoryCacheLevel, type StoredHeapItem } from "./memory.level";
import { triggerMemoryChange } from "./memory-event.manager";

class EmptyEvictionPolicy extends AbstractMemoryEvictionPolicy {
	evict(_cacheLevel: MemoryCacheLevel): void {}
}

describe("EvictionManager", () => {
	let memoryLevel: MemoryCacheLevel;
	let evictionPolicy: FirstExpiringMemoryPolicy;
	let memoryWithoutEvictionPolicy: MemoryCacheLevel;
	let memoryStrategy: RamPercentageLimitStrategy<StoredHeapItem>;

	beforeEach(() => {
		evictionPolicy = new FirstExpiringMemoryPolicy();
		memoryStrategy = new RamPercentageLimitStrategy(0); // Always triggers
		memoryLevel = new MemoryCacheLevel({
			memoryStrategies: [memoryStrategy],
			evictionPolicy,
		});
		memoryWithoutEvictionPolicy = new MemoryCacheLevel({
			memoryStrategies: [memoryStrategy],
			evictionPolicy: new EmptyEvictionPolicy(),
		});
	});

	it("evicts expired items on memory change", async () => {
		const mdelSpy = vi.spyOn(memoryWithoutEvictionPolicy, "mdel");

		await memoryWithoutEvictionPolicy.set("expired", "hi", -3600);
		await memoryWithoutEvictionPolicy.set("valid", "hi", 360000);

		// Heap should not contain expired value
		expect(await memoryWithoutEvictionPolicy.getHeap().toArray().length).toBe(
			1,
		);

		expect(
			await memoryWithoutEvictionPolicy.mget(["expired", "valid"]),
		).toEqual([undefined, "hi"]);

		// Heap should not mutate on mget
		expect(await memoryWithoutEvictionPolicy.getHeap().toArray().length).toBe(
			1,
		);

		expect(await memoryWithoutEvictionPolicy.get("invalid")).toEqual(undefined);
		// Heap should not mutate on get
		expect(await memoryWithoutEvictionPolicy.getHeap().toArray().length).toBe(
			1,
		);

		expect(mdelSpy).toHaveBeenCalledExactlyOnceWith(["expired"]);

		const validValue = await memoryWithoutEvictionPolicy.get("valid");
		expect(validValue).toBe("hi");

		const invalidValue = await memoryWithoutEvictionPolicy.get("invalid");
		expect(invalidValue).toBe(undefined);

		const otherValue = await memoryWithoutEvictionPolicy.get("valid");
		expect(otherValue).toBe("hi");

		const items = await memoryWithoutEvictionPolicy.mget(["expired", "valid"]);
		expect(items).toEqual([undefined, "hi"]);

		expect(memoryWithoutEvictionPolicy.getHeap().top()?.key).toBe("valid");
	});

	it("does not evict if no strategy triggers", async () => {
		const neverStrategy = new RamPercentageLimitStrategy(100); // Never triggers
		const neverOptions = {
			memoryStrategies: [neverStrategy],
			evictionPolicy,
		};
		const evictSpy = vi.spyOn(evictionPolicy, "evict");
		new EvictionManager(memoryLevel, neverOptions);
		triggerMemoryChange();
		expect(evictSpy).not.toHaveBeenCalled();
	});

	it(
		"should not serve stale content, i.e. when get is called which is expired, evict should run first",
	);
});
