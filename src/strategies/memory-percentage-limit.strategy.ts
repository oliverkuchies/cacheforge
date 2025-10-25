import { InMemory } from "../levels/interfaces/in-memory";
import { MemoryEvictionPolicy } from "../policies/interfaces/memory-eviction.policy";
import { MemoryManagementStrategy } from "./interfaces/memory-management-strategy";

export class MemoryPercentageLimitStrategy<T> implements MemoryManagementStrategy<T> {
    constructor(private threshold: number, private evictionPolicy: MemoryEvictionPolicy<T>) {}
    checkCondition(memory: InMemory<T>): boolean {
        const usage = memory.getMemoryUsage();
        return usage > this.threshold;
    }
    async execute(memory: InMemory<T>): Promise<void> {
        if (this.checkCondition(memory)) {
            await this.evictionPolicy.evict(memory);
        }
    }
}