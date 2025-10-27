"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryPercentageLimitStrategy = void 0;
class MemoryPercentageLimitStrategy {
    threshold;
    constructor(threshold) {
        this.threshold = threshold;
    }
    checkCondition(memory) {
        const usage = memory.getMemoryUsage();
        return usage > this.threshold;
    }
}
exports.MemoryPercentageLimitStrategy = MemoryPercentageLimitStrategy;
//# sourceMappingURL=memory-percentage-limit.strategy.js.map