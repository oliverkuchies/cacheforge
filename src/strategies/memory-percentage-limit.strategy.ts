import type { StoredHeapItem } from "../levels";
import type { InMemory } from "../levels/interfaces/in-memory";
import type { MemoryManagementStrategy } from "./interfaces/memory-management-strategy";

export class MemoryPercentageLimitStrategy<T = StoredHeapItem>
	implements MemoryManagementStrategy<T>
{
	constructor(private threshold: number) {}
	checkCondition(memory: InMemory<T>): boolean {
		const usage = memory.getMemoryUsage();
		return usage > this.threshold;
	}
}
