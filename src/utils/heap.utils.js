"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCacheHeap = void 0;
const heap_1 = require("@datastructures-js/heap");
const createCacheHeap = (comparator) => {
    let itemCounter = 0;
    const heap = new heap_1.MinHeap(comparator);
    heap.rebuild = (items) => {
        heap.clear();
        items.forEach((item) => {
            heap.insert(item);
        });
        itemCounter = 0;
    };
    const originalPop = heap.pop.bind(heap);
    heap.pop = () => {
        itemCounter -= 1;
        return originalPop();
    };
    const originalInsert = heap.insert.bind(heap);
    heap.insert = (item) => {
        itemCounter++;
        return originalInsert(item);
    };
    const originalClear = heap.clear.bind(heap);
    heap.clear = () => {
        itemCounter = 0;
        return originalClear();
    };
    heap.getSnapshot = () => Array.from(heap);
    heap.getCount = () => itemCounter;
    return heap;
};
exports.createCacheHeap = createCacheHeap;
//# sourceMappingURL=heap.utils.js.map