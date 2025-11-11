export enum CacheType {
	MEMORY = "memory",
	DISK = "disk",
	DISTRIBUTED = "distributed",
}

export interface CacheLevel {
	cacheType: CacheType;
	/**
	 * Store multiple values in the cache.
	 * @param keys The cache keys.
	 * @param values The values to cache.
	 * @param ttl Time to live in seconds.
	 * @returns The cached values.
	 */
	mset<T>(keys: string[], values: T[], ttl?: number): Promise<T[]>;

	/**
	 * Retrieve multiple values from the cache.
	 * @param key The cache key.
	 * @param value A function that returns a value or a direct value to cache if the key is not found.
	 * @param ttl Time to live in seconds.
	 * @param namespace Used to group related cache entries for easier invalidation.
	 * @returns The cached value or null if not found.
	 */
	mget<T>(key: string[], ttl?: number, namespace?: string): Promise<T[]>;

	/**
	 * Retrieve a value from the cache.
	 * @param key The cache key.
	 * @returns The cached value or null if not found.
	 */
	get<T>(key: string): Promise<T>;
	/**
	 * Store a value in the cache.
	 * @param key The cache key.
	 * @param value The value to cache.
	 * @param ttl Time to live in seconds.
	 * @returns The cached value or null if the key already exists.
	 */
	set<T>(key: string, value: T, ttl?: number): Promise<T | null>;
	/**
	 * Delete a value from the cache.
	 * @param key The cache key.
	 */
	del(key: string | string[]): Promise<void>;

	/**
	 * Delete multiple values from the cache.
	 * @param keys The cache keys.
	 **/
	mdel(keys: string[]): Promise<void>;

	/**
	 * Flush all cache entries in this level.
	 */
	flushAll(): Promise<void>;
}
