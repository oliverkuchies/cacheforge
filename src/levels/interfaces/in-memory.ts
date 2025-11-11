import type { MemoryHeap } from "../../utils/heap.utils";
import type { CacheType } from "./cache-level";

export interface InMemory<T> {
	cacheType: CacheType.MEMORY;
	/**
	 * Get current memory usage as a percentage (entire system memory).
	 * @return Percentage of memory used.
	 */
	getMemoryUsage(): number;

	/**
	 * Get a snapshot of the current heap.
	 * @return Array of items in the heap.
	 */
	getHeap(): MemoryHeap<T>;

	/**
	 * Get the size of the key-value store in bytes.
	 * @return Size of the store in bytes.
	 */
	getStoreSize(): number;
}
