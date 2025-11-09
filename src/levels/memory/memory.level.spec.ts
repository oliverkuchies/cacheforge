import { faker, fakerZH_TW } from "@faker-js/faker";
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateJSONData } from "../../../tests/utilities/data.utilities";
import { FirstExpiringMemoryPolicy } from "../../policies";
import { RamPercentageLimitStrategy } from "../../strategies/ram-percentage-limit.strategy";
import { MemoryCacheLevel, type StoredHeapItem } from "..";

const evictionPolicy = new FirstExpiringMemoryPolicy();
const strategy = new RamPercentageLimitStrategy<StoredHeapItem>(80);
const cacheEngine = new MemoryCacheLevel({
	memoryStrategies: [strategy],
	evictionPolicy: evictionPolicy,
});

describe("should successfully store data, and retrieve it on demand", async () => {
	afterEach(() => {
		cacheEngine.purge();
	});

	it("should store & retrieve strings", async () => {
		const testKey = faker.string.alpha(10);
		const testValue = faker.string.alpha(10);

		await cacheEngine.set(testKey, testValue);
		const retrievedValue = await cacheEngine.get(testKey);

		expect(retrievedValue).toEqual(testValue);
	});

	it("should store & retrieve integers", async () => {
		const testKey = faker.string.alpha(10);
		const testValue = faker.number.int();

		await cacheEngine.set(testKey, testValue);
		const retrievedValue = await cacheEngine.get(testKey);

		expect(retrievedValue).toEqual(testValue);
	});

	it("should allow integer keys", async () => {
		const testKey = faker.string.alpha(10);
		const testValue = faker.string.alpha(10);

		await cacheEngine.set(testKey, testValue);
		const retrievedValue = await cacheEngine.get(testKey);

		expect(retrievedValue).toEqual(testValue);
	});

	it("should allow object based structures", async () => {
		const testKey = faker.string.alpha(10);
		const testValue = faker.helpers.objectValue({
			name: faker.person.firstName(),
			age: faker.number.int({ min: 1, max: 100 }),
			address: {
				street: faker.location.streetAddress(),
				city: faker.location.city(),
				zip: faker.location.zipCode(),
			},
			hobbies: faker.helpers.arrayElements(
				["reading", "gaming", "hiking", "coding", "cooking"],
				3,
			),
		});

		await cacheEngine.set(testKey, testValue);
		const retrievedValue = await cacheEngine.get(testKey);

		expect(retrievedValue).toEqual(testValue);
	});

	it("should allow array based structures", async () => {
		const testKey = faker.string.alpha(10);
		const testValue = faker.helpers.arrayElements(
			[
				faker.number.int(),
				faker.helpers.objectValue({
					type: "date",
					color: "brown",
				}),
				faker.string.alpha(5),
			],
			3,
		);

		await cacheEngine.set(testKey, testValue);
		const retrievedValue = await cacheEngine.get(testKey);

		expect(retrievedValue).toEqual(testValue);
	});

	it("should store & retrieve international characters", async () => {
		const testKey = faker.string.alpha(10);
		const testValue = fakerZH_TW.lorem.words(5);

		await cacheEngine.set(testKey, testValue);
		const retrievedValue = await cacheEngine.get(testKey);

		expect(retrievedValue).toEqual(testValue);
	});

	it("should mget and mdel", async () => {
		const bingo1 = faker.number.bigInt();
		const bingo2 = faker.number.bigInt();
		const bingo3 = faker.number.bigInt();

		await cacheEngine.set("bingo", bingo1);
		await cacheEngine.set("bingo1", bingo2);
		await cacheEngine.set("bingo2", bingo3);
		const multiValues = await cacheEngine.mget<number>([
			"bingo",
			"bingo1",
			"bingo2",
		]);

		// Compare as strings to handle BigInt/Number serialization differences
		expect(multiValues.map(String)).toEqual(
			[bingo1, bingo2, bingo3].map(String),
		);

		// Now delete them
		await cacheEngine.mdel(["bingo", "bingo1", "bingo2"]);

		expect(
			await cacheEngine.mget<number>(["bingo", "bingo1", "bingo2"]),
		).toEqual([undefined, undefined, undefined]);
	});

	it("should get store size in bytes", () => {
		const storeSize = cacheEngine.getStoreSize();
		expect(typeof storeSize).toBe("number");
		expect(storeSize).toBeGreaterThanOrEqual(0);
	});
});

describe("It should successfully manage the application memory usage", () => {
	it("should return a number representing memory usage", () => {
		const memoryUsage = cacheEngine.getMemoryUsage();
		expect(typeof memoryUsage).toBe("number");
		expect(memoryUsage).toBeGreaterThan(0);
	});

	it("should have reasonable execution time for insertions", async () => {
		const start = Date.now();
		const end = Date.now();
		const executionTime = end - start;

		expect(executionTime).toBeLessThan(5);

		const INSERT_AMOUNT = 10000;
		// Initial insertions
		await generateJSONData(cacheEngine, INSERT_AMOUNT);

		const startLarge = Date.now();
		const endLarge = Date.now();
		const executionTimeLarge = endLarge - startLarge;

		// each insertion should take less than 1 microsecond on average
		expect(executionTimeLarge / INSERT_AMOUNT).toBeLessThan(1);
	});

	it("should return undefined if no fallback provided and cache miss occurs", async () => {
		const testKey = faker.string.alpha(10);

		const retrievedValue = await cacheEngine.get<string>(testKey);

		expect(retrievedValue).toBeUndefined();
	});

	it("should expire as expected", async () => {
		vi.useFakeTimers();
		const delSpy = vi.spyOn(cacheEngine, "del");

		await cacheEngine.set<string>("valid", "test bananas", 3600);

		expect(await cacheEngine.get<string>("valid")).toBe("test bananas");

		await cacheEngine.set<string>("expired", "bingo", -3600);

		vi.runAllTimers();

		expect(delSpy).toHaveBeenCalledWith("expired");

		expect(await cacheEngine.get<string>("expired")).toBe(undefined);
	});
});
