import type { StoredHeapItem } from "../levels";
import type { InMemory } from "../levels/interfaces/in-memory";
import type { MemoryManagementStrategy } from "./interfaces/memory-management-strategy";

/**
 * This strategy checks if the current RAM usage percentage exceeds a defined threshold.
 * If the usage exceeds the threshold, it signals that eviction should occur.
 * This is useful for preventing the cache from consuming too much memory
 * and ensures that the application remains responsive.
 * However, it may lead to more frequent evictions in memory-constrained environments.
 */
export class RamPercentageLimitStrategy<T = StoredHeapItem>
	implements MemoryManagementStrategy<T>
{
	constructor(private threshold: number) {}
	checkCondition(memory: InMemory<T>): boolean {
		const usage = memory.getMemoryUsage();
		return usage > this.threshold;
	}
}
