import type { StoredHeapItem } from "../levels";
import type { InMemory } from "../levels/interfaces/in-memory";
import type { MemoryManagementStrategy } from "./interfaces/memory-management-strategy";
export declare class MemoryPercentageLimitStrategy<T = StoredHeapItem> implements MemoryManagementStrategy<T> {
    private threshold;
    constructor(threshold: number);
    checkCondition(memory: InMemory<T>): boolean;
}
//# sourceMappingURL=memory-percentage-limit.strategy.d.ts.map