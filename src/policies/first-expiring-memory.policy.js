"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirstExpiringMemoryPolicy = void 0;
const memory_eviction_policy_1 = require("./memory-eviction.policy");
const EVICTION_PERCENTAGE = 0.1;
class FirstExpiringMemoryPolicy extends memory_eviction_policy_1.MemoryEvictionPolicy {
    async evict(cacheLevel) {
        const heap = cacheLevel.getHeap();
        const heapSize = heap.getCount();
        const batchSize = Math.ceil(heapSize * EVICTION_PERCENTAGE);
        const concurrency = 1000;
        let remaining = batchSize;
        while (remaining > 0) {
            const currentBatch = [];
            for (let i = 0; i < Math.min(concurrency, remaining); i++) {
                const itemToDelete = heap.pop();
                if (itemToDelete) {
                    currentBatch.push(cacheLevel.del(itemToDelete.key));
                }
            }
            await Promise.allSettled(currentBatch);
            remaining -= currentBatch.length;
        }
    }
}
exports.FirstExpiringMemoryPolicy = FirstExpiringMemoryPolicy;
//# sourceMappingURL=first-expiring-memory.policy.js.map