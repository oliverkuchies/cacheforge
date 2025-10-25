import { InMemory } from "../../levels/interfaces/in-memory";

export interface MemoryStrategy<T> {
    constructor(memory: InMemory<T>): void;
}
