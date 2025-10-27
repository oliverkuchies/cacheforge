import type { InMemory } from "../../levels/interfaces/in-memory";

export interface MemoryManagementStrategy<T> {
	checkCondition(memory: InMemory<T>): boolean;
}
