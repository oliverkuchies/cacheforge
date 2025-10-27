// Core service
export * from "./cache.service";

// Cache levels
export * from "./levels";

// Eviction policies
export * from "./policies";

// Memory management strategies
export { MemoryPercentageLimitStrategy } from "./strategies/memory-percentage-limit.strategy";

// Interfaces
export type { CacheLevel } from "./levels/interfaces/cache-level";
export type { Lockable } from "./levels/interfaces/lockable";
export type { Purgable } from "./levels/interfaces/purgable";
export type { InMemory } from "./levels/interfaces/in-memory";
export type { MemoryEvictionPolicy } from "./policies/interfaces/memory-eviction.policy";
export type { MemoryManagementStrategy } from "./strategies/interfaces/memory-management-strategy";
