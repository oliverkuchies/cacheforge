import type { CacheLevel } from "../levels/interfaces/cache-level";
export declare class VersionManager {
    private level;
    constructor(level: CacheLevel);
    /**
     * @description Get the current version for a given key
     * @param key
     * @returns {Promise<number>} current version
     */
    getCurrentVersion(key: string): Promise<number>;
    private buildLookupKey;
    /**
     * @description Get the versioned key lookup for a given key
     * @param key
     * @param namespace
     * @returns {Promise<string>} versioned key
     */
    getOrSetVersionedKeyLookup(key: string, namespace?: string): Promise<string>;
    /**
     * @description Invalidate the current version for a given key
     * @param key
     * @returns {Promise<number>} new version
     */
    invalidate(key: string): Promise<number>;
    /**
     * Get with version to prevent extra lookup latency
     */
    getWithVersion<T>(key: string, version: number, value?: (() => Promise<T>) | T, ttl?: number, namespace?: string): Promise<T | null>;
    /**
     * Set with version to prevent extra lookup latency
     * @param key
     * @param value
     * @param version
     * @param ttl
     */
    setWithVersion<T>(key: string, value: T, version?: number, ttl?: number): Promise<T | null>;
    /**
     * @description Get the value for a given key
     * @param key - cache key
     * @param value - optional value or function to get the value
     * @param ttl - optional time to live
     * @param namespace - optional namespace for versioning
     * @returns {Promise<T | null>} value
     */
    get<T>(key: string, value?: (() => Promise<T>) | T, ttl?: number, namespace?: string): Promise<T | null>;
    set<T>(key: string, value: T, ttl?: number, namespace?: string): Promise<string | undefined>;
    del(key: string, namespace?: string): Promise<string | undefined>;
    private retrieveVersionFromKey;
}
//# sourceMappingURL=version-manager.d.ts.map