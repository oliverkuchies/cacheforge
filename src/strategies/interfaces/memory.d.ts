import type { InMemory } from "../../levels/interfaces/in-memory";
export interface MemoryStrategy<T> {
    checkCondition(memory: InMemory<T>): boolean;
}
//# sourceMappingURL=memory.d.ts.map