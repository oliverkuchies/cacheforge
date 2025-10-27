import type { MemoryCacheLevel } from "../../levels";

export abstract class AbstractMemoryEvictionPolicy {
	abstract evict(cacheLevel: MemoryCacheLevel): void;
}
