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
	 * @param valueGetter - function to get the value if not present in cache
	 * @param ttl - time to live in seconds
	 * @param namespace - used to group related cache entries for easier invalidation
	 */
	async get<T>(
		key: string,
		valueGetter?: () => Promise<T>,
		ttl?: number,
		namespace?: string,
	): Promise<T | null> {
		if (this.versioning) {
			const firstLevel = this.levels[0];
			if (!firstLevel) {
				throw new Error("set: Failed to find first cache level");
			}
			const versionedLevel = new VersionManager(firstLevel);
			const currentVersion = await versionedLevel.getCurrentVersion(
				namespace ?? key,
			);
			for (const level of this.levels) {
				try {
					const currentVersionedLevel = new VersionManager(level);
					return await currentVersionedLevel.getWithVersion<T>(
						key,
						currentVersion,
						valueGetter,
						ttl,
						namespace,
					);
				} catch (e) {
					console.warn(
						"Failed to getWithVersion, gracefully continuing with next level.",
						e,
					);
				}
			}
			return null;
		}

		for (const level of this.levels) {
			try {
				const value = await level.get<T>(key, valueGetter, ttl);
				if (value !== undefined && value !== null) {
					return value;
				}
			} catch (e) {
				console.warn(
					"Failed to get, gracefully continuing with next level.",
					e,
				);
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
	async set<T>(
		key: string,
		value: T,
		ttl = this.defaultTTL,
		namespace?: string,
	): Promise<void> {
		if (this.versioning) {
			const firstLevel = this.levels[0];

			if (!firstLevel) {
				throw new Error("set: Failed to find first cache level");
			}

			const versionedLevel = new VersionManager(firstLevel);

			const currentVersion = await versionedLevel.getCurrentVersion(
				namespace ?? key,
			);

			await Promise.allSettled(
				this.levels.map((level) => {
					try {
						const currentLevel = new VersionManager(level);
						return currentLevel.setWithVersion(key, value, currentVersion, ttl);
					} catch (e) {
						// Gracefully catch set errors, so we can move to next level
						console.warn(
							"Failed to setWithVersion, gracefully continuing with next level.",
							e,
						);
						return Promise.reject(e);
					}
				}),
			);

			return;
		}

		await Promise.allSettled(
			this.levels.map((level) => {
				try {
					return level.set<T>(key, value, ttl);
				} catch (e) {
					// Gracefully catch set errors, so we can move to next level
					console.warn(
						"Failed to set, gracefully continuing with next level.",
						e,
					);
					return Promise.reject(e);
				}
			}),
		);
	}

	/**
	 * Delete the value for the given key from all cache levels
	 * @param key - key to delete
	 */
	async del(key: string, namespace?: string): Promise<void> {
		await Promise.allSettled(
			this.levels.map((level) => {
				try {
					if (this.versioning) {
						const versionedLevel = new VersionManager(level);
						return versionedLevel.del(key, namespace);
					}
					return level.del(key);
				} catch (e) {
					console.warn(
						"Failed to delete key, gracefully continuing with next level.",
						e,
					);
					return Promise.reject(e);
				}
			}),
		);
		return;
	}

	/**
	 * Invalidates given key via increment
	 * @param key - key to invalidate
	 * @throws Error - if invalidation fails, not handled intentionally.
	 */
	async invalidateKey(key: string): Promise<void> {
		const promises = [];
		if (this.versioning) {
			for (const level of this.levels) {
				const versionedLevel = new VersionManager(level);
				promises.push(versionedLevel.invalidate(key));
			}
		}
		await Promise.allSettled(promises);
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
