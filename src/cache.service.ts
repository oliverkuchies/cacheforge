import { DEFAULT_LOCK_TTL, DEFAULT_TTL } from "./constants";
import { VersionManager } from "./features/version-manager";
import type { CacheLevel } from "./levels/interfaces/cache-level";
import type { Lockable } from "./levels/interfaces/lockable";

interface CacheServiceOptions {
	levels: CacheLevel[];
	defaultTTL?: number;
	defaultLockTTL?: number;
	versioning?: boolean;
}

export class CacheService {
	protected levels: CacheLevel[];
	protected defaultTTL: number;
	protected defaultLockTTL: number;
	protected versioning: boolean;

	constructor(options: CacheServiceOptions) {
		this.levels = options.levels;
		this.defaultTTL = options.defaultTTL ?? DEFAULT_TTL;
		this.defaultLockTTL = options.defaultLockTTL ?? DEFAULT_LOCK_TTL;
		this.versioning = options.versioning ?? false;
	}

	/**
	 * Loop through cache levels to get the value for the given key
	 * @param key - cache key
	 * @returns cached value or null if not found
	 */
	async get<T>(key: string): Promise<T | null> {
		for (const level of this.levels) {
			let value: T | null;
			if (this.versioning) {
				const versionedLevel = new VersionManager(level);
				value = await versionedLevel.get<T>(key);
			} else {
				value = await level.get<T>(key);
			}

			if (value !== null && value !== undefined) {
				return value;
			}
		}
		return null;
	}

	/**
	 * Set the value for the given key in all cache levels
	 * @param key - cache key
	 * @param value - value to cache
	 * @param ttl - time to live in seconds
	 */
	async set<T>(key: string, value: T, ttl = this.defaultTTL): Promise<void> {
		await Promise.allSettled(
			this.levels.map((level) => {
				if (this.versioning) {
					const versionedLevel = new VersionManager(level);
					return versionedLevel.set<T>(key, value, ttl);
				}
				return level.set<T>(key, value, ttl);
			}),
		);
	}

	/**
	 * Delete the value for the given key from all cache levels
	 * @param key - key to delete
	 */
	async del(key: string): Promise<void> {
		await Promise.allSettled(
			this.levels.map((level) => {
				if (this.versioning) {
					const versionedLevel = new VersionManager(level);
					return versionedLevel.del(key);
				}
				return level.del(key);
			}),
		);
	}

	/**
	 * Acquire a lock for the given key and execute the callback function once the lock is acquired
	 * Prevent multiple processes from executing the same code simultaneously.
	 * Retrieve the first cache level that supports locking and use it to acquire the lock.
	 * @param key - cache key
	 * @param callback - function to execute while holding the lock
	 * @param ttl - time to live for the lock
	 * @returns result of the callback function
	 */
	async lock<T>(
		key: string,
		callback: () => Promise<T>,
		ttl = this.defaultLockTTL,
	): Promise<T> {
		const lockLevels = this.levels.filter((l): l is Lockable => "lock" in l);
		for (const level of lockLevels) {
			return level.lock<T>(key, callback, ttl);
		}

		throw new Error("Locking not supported in the current cache levels.");
	}
}
