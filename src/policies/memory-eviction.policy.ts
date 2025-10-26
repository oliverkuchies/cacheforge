import type { MemoryCacheLevel } from "../levels";

export abstract class MemoryEvictionPolicy {
	abstract evict(cacheLevel: MemoryCacheLevel): void;
}
