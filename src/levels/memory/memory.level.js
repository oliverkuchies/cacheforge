"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryCacheLevel = void 0;
const node_os_1 = __importDefault(require("node:os"));
const constants_1 = require("../../constants");
const heap_utils_1 = require("../../utils/heap.utils");
class MemoryCacheLevel {
    store = new Map();
    heap = (0, heap_utils_1.createCacheHeap)((item) => item.expiry);
    constructor(options) {
        if (options.memoryStrategies.some((strategy) => strategy.checkCondition(this))) {
            options.evictionPolicy.evict(this);
        }
    }
    async get(key, value, ttl) {
        const cachedValue = this.store.get(key);
        if (cachedValue === null || cachedValue === undefined) {
            let newValue;
            if (value instanceof Function) {
                newValue = await value();
            }
            else {
                newValue = value;
            }
            await this.set(key, newValue, ttl);
            return newValue;
        }
        return cachedValue.value;
    }
    set(key, value, ttl = constants_1.DEFAULT_TTL) {
        const expiryDate = Date.now() + ttl;
        const storedItem = { value, expiry: expiryDate };
        const heapItem = { key, ...storedItem };
        this.store.set(key, storedItem);
        this.heap.insert(heapItem);
        return Promise.resolve(value);
    }
    del(key) {
        this.store.delete(key);
        return Promise.resolve();
    }
    purge() {
        this.heap.clear();
        this.store.clear();
    }
    getMemoryUsage() {
        const memoryAvailable = node_os_1.default.totalmem() - node_os_1.default.freemem();
        return (memoryAvailable / node_os_1.default.totalmem()) * 100;
    }
    getHeap() {
        return this.heap;
    }
}
exports.MemoryCacheLevel = MemoryCacheLevel;
//# sourceMappingURL=memory.level.js.map