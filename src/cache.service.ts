import { DEFAULT_LOCK_TTL, DEFAULT_TTL } from "./constants";
import { VersionManager } from "./features/version-manager";
import type { CacheLevel } from "./levels/interfaces/cache-level";
import type { Lockable } from "./levels/interfaces/lockable";
import {
	backfillLevels,
	backfillLevelsWithMultiKeys,
	backfillVersionedLevels,
} from "./utils/backfill.utils";
import { handleGracefully } from "./utils/error.utils";

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
		const { defaultTTL, defaultLockTTL, levels, versioning } = options;

		this.levels = levels;
		this.defaultTTL =
			typeof defaultTTL === "number" && !Number.isNaN(defaultTTL)
				? defaultTTL
				: DEFAULT_TTL;
		this.defaultLockTTL =
			typeof defaultLockTTL === "number" && !Number.isNaN(defaultLockTTL)
				? defaultLockTTL
				: DEFAULT_LOCK_TTL;
		this.versioning = versioning ?? false;
	}

	/**
	 * Flush all cache levels
	 * Note: Do not use in production as it will clear the entire cache and may lead to performance issues.
	 * @return void
	 */
	async flushAll(): Promise<void> {
		await Promise.allSettled(
			this.levels.map((level) =>
				handleGracefully(async () => {
					return await level.flushAll();
				}, "Failed to flush cache level"),
			),
		);
	}

	/**
	 * Loop through cache levels to set the values for the given keys
	 * @param keys - cache keys
	 * @param values - values to cache
	 * @param ttl - time to live in seconds
	 */

	async mset<T>(
		keys: string[],
		values: T[],
		ttl = this.defaultTTL,
	): Promise<void> {
		await Promise.allSettled(
			this.levels.map((level) =>
				handleGracefully(
					() => level.mset<T>(keys, values, ttl),
					"Failed to mset keys in cache level",
				),
			),
		);
	}

	/**
	 * Loop through cache levels to get the values for the given keys,
	 * upon failure backfill missing keys
	 * @param keys - cache keys
	 * @returns array of cached values or null if not found
	 */
	async mget(keys: string[]) {
		const results: unknown[] = new Array(keys.length).fill(null);
		const missingKeysIndexes: number[] = [];
		const failedLevels: CacheLevel[] = [];

		for (const level of this.levels) {
			const levelResults = await level.mget<unknown>(keys);

			for (let i = 0; i < keys.length; i++) {
				const value = levelResults[i];
				if (value !== undefined && value !== null) {
					results[i] = value;
				} else {
					failedLevels.push(level);
					missingKeysIndexes.push(i);
				}
			}
		}

		await backfillLevelsWithMultiKeys(
			failedLevels,
			keys.filter((_, index) => missingKeysIndexes.includes(index)),
			results.filter((_, index) => missingKeysIndexes.includes(index)),
		);

		return results;
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
		valueGetter: (() => Promise<T>) | T,
		ttl?: number,
		namespace?: string,
	): Promise<T> {
		if (this.versioning) {
			const firstLevel = this.levels[0];
			if (!firstLevel) {
				throw new Error("set: Failed to find first cache level");
			}
			const versionedLevel = new VersionManager(firstLevel);
			const currentVersion = await versionedLevel.getCurrentVersion(
				namespace ?? key,
			);
			const failedLevels: CacheLevel[] = [];
			for (const level of this.levels) {
				try {
					const currentVersionedLevel = new VersionManager(level);
					const versionedValue = await currentVersionedLevel.getWithVersion<T>(
						key,
						currentVersion,
						valueGetter,
						ttl,
						namespace,
					);

					if (versionedValue !== undefined && versionedValue !== null) {
						await backfillVersionedLevels(
							failedLevels,
							key,
							versionedValue,
							currentVersion,
							ttl,
						);
						return versionedValue as T;
					} else {
						failedLevels.push(level);
					}
				} catch (e) {
					console.warn(
						"Failed to getWithVersion, gracefully continuing with next level.",
						e,
					);
					failedLevels.push(level);
				}
			}

			let newValue = valueGetter;

			if (valueGetter instanceof Function) {
				newValue = await valueGetter();

				await this.set(key, newValue, ttl, namespace);
			}

			return newValue as T;
		}

		const failedLevels: CacheLevel[] = [];
		for (const level of this.levels) {
			try {
				const value = await level.get<T>(key);

				if (value !== undefined && value !== null) {
					await backfillLevels(failedLevels, key, value, ttl);
					return value;
				} else {
					failedLevels.push(level);
				}
			} catch (e) {
				console.warn(
					"Failed to get, gracefully continuing with next level.",
					e,
				);
				failedLevels.push(level);
			}
		}

		let newValue = valueGetter;
		if (valueGetter instanceof Function) {
			newValue = await valueGetter();
		}

		await this.set(key, newValue, ttl, namespace);

		return newValue as T;
	}

	async mdel(keys: string[]): Promise<void> {
		await Promise.allSettled(
			this.levels.map((level) =>
				handleGracefully(async () => {
					return await level.mdel(keys);
				}, "Failed to mdel keys from cache level"),
			),
		);
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
					return handleGracefully(async () => {
						const currentLevel = new VersionManager(level);
						return currentLevel.setWithVersion(key, value, currentVersion, ttl);
					}, "Failed to setWithVersion, gracefully continuing with next level.");
				}),
			);

			return;
		}

		await Promise.allSettled(
			this.levels.map((level) => {
				return handleGracefully(
					() => level.set<T>(key, value, ttl),
					"Failed to set key in cache level",
				);
			}),
		);
	}

	/**
	 * Delete the value for the given key from all cache levels
	 * @param key - key to delete
	 */
	async del(key: string, namespace?: string): Promise<void> {
		await Promise.allSettled(
			this.levels.map(
				async (level) =>
					await handleGracefully(async () => {
						if (this.versioning) {
							const versionedLevel = new VersionManager(level);
							return versionedLevel.del(key, namespace);
						}
						return level.del(key);
					}, "Failed to delete key from cache level"),
			),
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
