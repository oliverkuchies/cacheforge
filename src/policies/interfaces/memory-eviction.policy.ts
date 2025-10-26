import { CacheLevel } from "../../levels/interfaces/cache-level";
import type { InMemory } from "../../levels/interfaces/in-memory";

export interface MemoryEvictionPolicy<T> {
	evict(cacheLevel: InMemory<T>): void;
}
