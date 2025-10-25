import { CacheLevel } from "./cache-level";

export interface Lockable extends CacheLevel {
    /**
     * Lock a cache entry for exclusive access.
     * @param key The cache key to lock.
     * @param callback The function to execute while holding the lock.
     * @param ttl Time to live for the lock in seconds.
     * @returns The result of the callback function.
     */
    lock<T>(key: string, callback: () => Promise<T>, ttl?: number): Promise<T>;
}