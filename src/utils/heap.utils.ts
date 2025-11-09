import { MinHeap } from "@datastructures-js/heap";
import { serialize } from "./parsing.utils";

export interface MemoryHeap<T> extends MinHeap<T> {
	rebuild: (items: T[]) => void;
	getSnapshot: () => T[];
	getCount: () => number;
	getTotalSize: () => number;
}

export const createCacheHeap = <T>(comparator: (a: T) => number) => {
	let itemCounter = 0;
	let totalSize = 0;
	const heap = new MinHeap<T>(comparator) as MemoryHeap<T>;
	
	const originalInsert = heap.insert.bind(heap);
	heap.insert = (item: T) => {
		itemCounter++;
		totalSize += Buffer.byteLength(serialize(item), "utf8");
		return originalInsert(item);
	};

	heap.getTotalSize = () => totalSize;

	const originalClear = heap.clear.bind(heap);
	heap.clear = () => {
		itemCounter = 0;
		totalSize = 0;
		return originalClear();
	};


	heap.rebuild = (items: T[]) => {
		heap.clear();
		items.forEach((item) => {
			heap.insert(item);
		});
		itemCounter = 0;
	};


	const originalPop = heap.pop.bind(heap);
	heap.pop = () => {
		itemCounter -= 1;
		const item = originalPop();
		totalSize -= Buffer.byteLength(serialize(item), "utf8");
		return item;
	};

	heap.getSnapshot = () => Array.from(heap);
	heap.getCount = () => itemCounter;

	return heap;
};
