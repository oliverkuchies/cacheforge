"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryPercentageLimitStrategy = void 0;
// Core service
__exportStar(require("./cache.service"), exports);
// Cache levels
__exportStar(require("./levels"), exports);
// Eviction policies
__exportStar(require("./policies"), exports);
// Memory management strategies
var memory_percentage_limit_strategy_1 = require("./strategies/memory-percentage-limit.strategy");
Object.defineProperty(exports, "MemoryPercentageLimitStrategy", { enumerable: true, get: function () { return memory_percentage_limit_strategy_1.MemoryPercentageLimitStrategy; } });
//# sourceMappingURL=index.js.map