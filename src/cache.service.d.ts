import type { CacheLevel } from "./levels/interfaces/cache-level";
interface CacheServiceOptions {
    levels: CacheLevel[];
    defaultTTL?: number;
    defaultLockTTL?: number;
    versioning?: boolean;
}
export declare class CacheService {
    protected levels: CacheLevel[];
    protected defaultTTL: number;
    protected defaultLockTTL: number;
    protected versioning: boolean;
    constructor(options: CacheServiceOptions);
    /**
     * Loop through cache levels to get the value for the given key
     * @param key - cache key
     * @returns cached value or null if not found
     * @param valueGetter - function to get the value if not present in cache
     * @param ttl - time to live in seconds
     * @param namespace - used to group related cache entries for easier invalidation
     */
    get<T>(key: string, valueGetter?: () => Promise<T>, ttl?: number, namespace?: string): Promise<T | null>;
    /**
     * Set the value for the given key in all cache levels
     * @param key - cache key
     * @param value - value to cache
     * @param ttl - time to live in seconds
     */
    set<T>(key: string, value: T, ttl?: number, namespace?: string): Promise<void>;
    /**
     * Delete the value for the given key from all cache levels
     * @param key - key to delete
     */
    del(key: string, namespace?: string): Promise<void>;
    /**
     * Invalidates given key via increment
     * @param key - key to invalidate
     * @throws Error - if invalidation fails, not handled intentionally.
     */
    invalidateKey(key: string): Promise<void>;
    /**
     * Acquire a lock for the given key and execute the callback function once the lock is acquired
     * Prevent multiple processes from executing the same code simultaneously.
     * Retrieve the first cache level that supports locking and use it to acquire the lock.
     * @param key - cache key
     * @param callback - function to execute while holding the lock
     * @param ttl - time to live for the lock
     * @returns result of the callback function
     */
    lock<T>(key: string, callback: () => Promise<T>, ttl?: number): Promise<T>;
}
export {};
//# sourceMappingURL=cache.service.d.ts.map