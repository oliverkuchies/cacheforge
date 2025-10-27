import type { MemoryCacheLevel } from "../levels/memory/memory.level";
import { AbstractMemoryEvictionPolicy } from "./abstract/abstract-memory-eviction.policy";

const EVICTION_PERCENTAGE = 0.1;

export class FirstExpiringMemoryPolicy extends AbstractMemoryEvictionPolicy {
	async evict(cacheLevel: MemoryCacheLevel): Promise<void> {
		const heap = cacheLevel.getHeap();
		const heapSize = heap.getCount();
		const batchSize = Math.ceil(heapSize * EVICTION_PERCENTAGE);
		const concurrency = 1000;

		let remaining = batchSize;
		while (remaining > 0) {
			const currentBatch = [];
			for (let i = 0; i < Math.min(concurrency, remaining); i++) {
				const itemToDelete = heap.pop();
				if (itemToDelete) {
					currentBatch.push(cacheLevel.del(itemToDelete.key));
				}
			}
			await Promise.allSettled(currentBatch);
			remaining -= currentBatch.length;
		}
	}
}
