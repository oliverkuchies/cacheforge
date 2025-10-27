import type { MemoryEvictionPolicy } from "../../policies/memory-eviction.policy";
import type { MemoryManagementStrategy } from "../../strategies/interfaces/memory-management-strategy";
import type { CacheLevel } from "../interfaces/cache-level";
import type { InMemory } from "../interfaces/in-memory";
import type { Purgable } from "../interfaces/purgable";
export interface StoredItem {
    value: unknown;
    expiry: number;
}
export interface StoredHeapItem extends StoredItem {
    key: string;
}
interface MemoryLevelOptions<T> {
    memoryStrategies: MemoryManagementStrategy<T>[];
    evictionPolicy: MemoryEvictionPolicy;
}
export declare class MemoryCacheLevel implements CacheLevel, Purgable, InMemory<StoredHeapItem> {
    protected store: Map<string, StoredItem>;
    protected heap: import("../../utils/heap.utils").MemoryHeap<StoredHeapItem>;
    constructor(options: MemoryLevelOptions<StoredHeapItem>);
    get<T>(key: string, value?: (() => Promise<T>) | T, ttl?: number): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number): Promise<T | null>;
    del(key: string): Promise<void>;
    purge(): void;
    getMemoryUsage(): number;
    getHeap(): import("../../utils/heap.utils").MemoryHeap<StoredHeapItem>;
}
export {};
//# sourceMappingURL=memory.level.d.ts.map