"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const heap_utils_1 = require("../utils/heap.utils");
(0, vitest_1.describe)("heap utilities", async () => {
    (0, vitest_1.it)("should successfully add and extract items in order", () => {
        const heap = (0, heap_utils_1.createCacheHeap)((item) => item.expiry);
        heap.insert({ value: "item1", expiry: 3000 });
        heap.insert({ value: "item2", expiry: 1000 });
        heap.insert({ value: "item3", expiry: 2000 });
        const extractedItems = [];
        while (!heap.isEmpty()) {
            extractedItems.push(heap.extractRoot());
        }
        (0, vitest_1.expect)(extractedItems).toEqual([
            { value: "item2", expiry: 1000 },
            { value: "item3", expiry: 2000 },
            { value: "item1", expiry: 3000 },
        ]);
    });
    (0, vitest_1.it)("should successfully rebuild the heap", () => {
        const heap = (0, heap_utils_1.createCacheHeap)((item) => item.expiry);
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
        (0, vitest_1.expect)(extractedItems).toEqual([
            { value: "item4", expiry: 1500 },
            { value: "item3", expiry: 2000 },
        ]);
    });
    (0, vitest_1.it)("should handle rebuilding an empty heap", () => {
        const heap = (0, heap_utils_1.createCacheHeap)((item) => item.expiry);
        heap.rebuild([]);
        (0, vitest_1.expect)(heap.isEmpty()).toBe(true);
    });
    (0, vitest_1.it)("should successfully insert heap items", () => {
        const heap = (0, heap_utils_1.createCacheHeap)((item) => item.expiry);
        heap.insert({ value: "item1", expiry: 5000 });
        (0, vitest_1.expect)(heap.isEmpty()).toBe(false);
        (0, vitest_1.expect)(heap.extractRoot()).toEqual({ value: "item1", expiry: 5000 });
    });
    (0, vitest_1.it)("should return true for isEmpty on a new heap", () => {
        const heap = (0, heap_utils_1.createCacheHeap)((item) => item.expiry);
        (0, vitest_1.expect)(heap.isEmpty()).toBe(true);
    });
    (0, vitest_1.it)("should return false for isEmpty after insert", () => {
        const heap = (0, heap_utils_1.createCacheHeap)((item) => item.expiry);
        heap.insert({ value: "item1", expiry: 4000 });
        (0, vitest_1.expect)(heap.isEmpty()).toBe(false);
    });
    (0, vitest_1.it)("should clear the heap successfully", () => {
        const heap = (0, heap_utils_1.createCacheHeap)((item) => item.expiry);
        heap.insert({ value: "item1", expiry: 4000 });
        heap.clear();
        (0, vitest_1.expect)(heap.isEmpty()).toBe(true);
    });
    (0, vitest_1.it)("should keep count", () => {
        const heap = (0, heap_utils_1.createCacheHeap)((item) => item.expiry);
        heap.insert({ value: "item1", expiry: 4000 });
        (0, vitest_1.expect)(heap.getCount()).toBe(1);
        heap.clear();
        (0, vitest_1.expect)(heap.getCount()).toBe(0);
        heap.insert({ value: "item1", expiry: 4000 });
        heap.insert({ value: "item1", expiry: 4000 });
        heap.insert({ value: "item1", expiry: 4000 });
        (0, vitest_1.expect)(heap.getCount()).toBe(3);
    });
});
//# sourceMappingURL=heap.utils.spec.js.map