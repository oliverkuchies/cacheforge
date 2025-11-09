import type { StoredHeapItem } from "../levels";
import type { InMemory } from "../levels/interfaces/in-memory";
import type { MemoryManagementStrategy } from "./interfaces/memory-management-strategy";

/**
 * This strategy checks if the total size of items in the cache exceeds a defined threshold.
 * The threshold is a percentage of the total RAM allocated to the Node.js process.
 * If the size exceeds the threshold, it signals that eviction should occur.
 * This helps in managing memory usage effectively and prevents the cache from consuming excessive memory.
 * For instance, if my cache has 11% of the total RAM allocated to Node.js, and the threshold is set to 10%,
 * the strategy will indicate that eviction is necessary.
 */

export class MemorySizeLimitStrategy<T = StoredHeapItem>
	implements MemoryManagementStrategy<T>
{
	constructor(private threshold: number) {}
	checkCondition(memory: InMemory<T>): boolean {
		const heap = memory.getHeap();
		const heapSize = heap.getTotalSize();
		const keyStoreSize = memory.getStoreSize();
		const totalSize = heapSize + keyStoreSize;
		const usage = (totalSize / process.memoryUsage().heapTotal) * 100;
		return usage >= this.threshold;
	}
}
