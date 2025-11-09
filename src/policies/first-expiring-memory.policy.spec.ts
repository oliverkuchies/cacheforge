import { afterEach, describe, expect, it } from "vitest";
import { generateJSONData } from "../../tests/utilities/data.utilities";
import { MemoryCacheLevel } from "../levels";
import { RamPercentageLimitStrategy } from "../strategies/ram-percentage-limit.strategy";
import { FirstExpiringMemoryPolicy } from "./first-expiring-memory.policy";

const policy = new FirstExpiringMemoryPolicy();
const strategy = new RamPercentageLimitStrategy(80);
const cacheEngine = new MemoryCacheLevel({
	memoryStrategies: [strategy],
	evictionPolicy: policy,
});

describe("First Expiring Memory Policy", () => {
	afterEach(() => {
		cacheEngine.purge();
	});
	it("should evict x amount of items from memory", async () => {
		await generateJSONData(cacheEngine, 1000);

		expect(cacheEngine.getHeap().getCount()).toEqual(1000);

		const policy = new FirstExpiringMemoryPolicy();
		await policy.evict(cacheEngine);

		expect(cacheEngine.getHeap().getCount()).toEqual(1000 - 0.1 * 1000);
	});

	it("should evict way too much to see how system handles it", async () => {
		await generateJSONData(cacheEngine, 1000);

		expect(cacheEngine.getHeap().getCount()).toEqual(1000);

		const policy = new FirstExpiringMemoryPolicy();

		await policy.evict(cacheEngine);

		// 10% has been removed.
		expect(cacheEngine.getHeap().getCount()).toEqual(900);
	});
});
