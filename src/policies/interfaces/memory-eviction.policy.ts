import { CacheLevel } from "../../levels/interfaces/cache-level";
import { InMemory } from "../../levels/interfaces/in-memory";

export interface MemoryEvictionPolicy<T> {
    evict(cacheLevel: InMemory<T>): void;
}