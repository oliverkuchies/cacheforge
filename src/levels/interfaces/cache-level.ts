export interface CacheLevel {
	/**
	 * Retrieve a value from the cache.
	 * @param key The cache key.
	 * @param value A function that returns a value or a direct value to cache if the key is not found.
	 * @param ttl Time to live in seconds.
	 * @param namespace Used to group related cache entries for easier invalidation.
	 * @returns The cached value or null if not found.
	 */
	get<T>(
		key: string,
		value?: (() => Promise<T>) | T,
		ttl?: number,
		namespace?: string,
	): Promise<T | null>;
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
	del(key: string): Promise<void>;
}
