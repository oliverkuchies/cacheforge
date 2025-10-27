import type { MemoryCacheLevel } from "../levels";
export declare abstract class MemoryEvictionPolicy {
    abstract evict(cacheLevel: MemoryCacheLevel): void;
}
//# sourceMappingURL=memory-eviction.policy.d.ts.map