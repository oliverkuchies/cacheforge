import { describe, expect, it } from "vitest";
import { createCacheHeap } from "../utils/heap.utils";

interface StoredItem {
	value: unknown;
	expiry: number;
}

describe("heap utilities", async () => {
	it("should successfully add and extract items in order", () => {
		const heap = createCacheHeap<StoredItem>((item) => item.expiry);
		heap.insert({ value: "item1", expiry: 3000 });
		heap.insert({ value: "item2", expiry: 1000 });
		heap.insert({ value: "item3", expiry: 2000 });

		const extractedItems = [];
		while (!heap.isEmpty()) {
			extractedItems.push(heap.extractRoot());
		}

		expect(extractedItems).toEqual([
			{ value: "item2", expiry: 1000 },
			{ value: "item3", expiry: 2000 },
			{ value: "item1", expiry: 3000 },
		]);
	});

	it("should successfully rebuild the heap", () => {
		const heap = createCacheHeap<StoredItem>((item) => item.expiry);
		heap.insert({ value: "item1", expiry: 3000 });
		heap.insert({ value: "item2", expiry: 1000 });

		// Rebuild with new items
		heap.rebuild([
			{ value: "item3", expiry: 2000 },
			{ value: "item4", expiry: 1500 },
		]);

		const extractedItems = [];
		while (!heap.isEmpty()) {
			extractedItems.push(heap.extractRoot());
		}

		expect(extractedItems).toEqual([
			{ value: "item4", expiry: 1500 },
			{ value: "item3", expiry: 2000 },
		]);
	});

	it("should handle rebuilding an empty heap", () => {
		const heap = createCacheHeap<StoredItem>((item) => item.expiry);
		heap.rebuild([]);
		expect(heap.isEmpty()).toBe(true);
	});

	it("should successfully insert heap items", () => {
		const heap = createCacheHeap<StoredItem>((item) => item.expiry);
		heap.insert({ value: "item1", expiry: 5000 });
		expect(heap.isEmpty()).toBe(false);
		expect(heap.extractRoot()).toEqual({ value: "item1", expiry: 5000 });
	});

	it("should return true for isEmpty on a new heap", () => {
		const heap = createCacheHeap<StoredItem>((item) => item.expiry);
		expect(heap.isEmpty()).toBe(true);
	});

	it("should return false for isEmpty after insert", () => {
		const heap = createCacheHeap<StoredItem>((item) => item.expiry);
		heap.insert({ value: "item1", expiry: 4000 });
		expect(heap.isEmpty()).toBe(false);
	});

	it("should clear the heap successfully", () => {
		const heap = createCacheHeap<StoredItem>((item) => item.expiry);
		heap.insert({ value: "item1", expiry: 4000 });
		heap.clear();
		expect(heap.isEmpty()).toBe(true);
	});

	it("should keep count", () => {
		const heap = createCacheHeap<StoredItem>((item) => item.expiry);
		heap.insert({ value: "item1", expiry: 4000 });
		expect(heap.getCount()).toBe(1);
		heap.clear();
		expect(heap.getCount()).toBe(0);
		heap.insert({ value: "item1", expiry: 4000 });
		heap.insert({ value: "item1", expiry: 4000 });
		heap.insert({ value: "item1", expiry: 4000 });
		expect(heap.getCount()).toBe(3);
	});
});
