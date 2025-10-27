import type IoRedis from "ioredis";
import type { Cluster } from "ioredis";
import type { CacheLevel } from "../interfaces/cache-level";
import type { Lockable } from "../interfaces/lockable";
export declare class RedisCacheLevel implements CacheLevel, Lockable {
    private client;
    constructor(client: IoRedis | Cluster);
    /**
     *
     * @param key - cache key
     * @param valueGetter - function to get the value if not present in cache
     * @param ttl - time to live in seconds
     * @param namespace - used to group related cache entries for easier invalidation
     * @returns
     */
    get<T>(key: string, value?: (() => Promise<T>) | T, ttl?: number): Promise<T>;
    set<T>(key: string, value: T, ttl?: number): Promise<T>;
    del(key: string): Promise<void>;
    lock<T>(key: string, callback: () => Promise<T>, ttl?: number): Promise<T>;
}
//# sourceMappingURL=redis.level.d.ts.map