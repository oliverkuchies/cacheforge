import type { MemoryCacheLevel } from "../levels/memory/memory.level";
import { MemoryEvictionPolicy } from "./memory-eviction.policy";
export declare class FirstExpiringMemoryPolicy extends MemoryEvictionPolicy {
    evict(cacheLevel: MemoryCacheLevel): Promise<void>;
}
//# sourceMappingURL=first-expiring-memory.policy.d.ts.map