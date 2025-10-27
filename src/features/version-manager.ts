import type { CacheLevel } from "../levels/interfaces/cache-level";
import { generateVersionLookupKey } from "../utils/version.utils";

const SEVEN_DAYS_IN_SECONDS = 3600 * 24 * 7;

export class VersionManager {
	constructor(private level: CacheLevel) {}

	/**
	 * @description Get the current version for a given key
	 * @param key
	 * @returns {Promise<number>} current version
	 */
	async getCurrentVersion(key: string): Promise<number> {
		try {
			const versionKey = generateVersionLookupKey(key);
			const value = await this.level.get<number>(
				versionKey,
				1,
				SEVEN_DAYS_IN_SECONDS,
			);
			return Number(value);
		} catch (e) {
			console.error("Failed to get version. Falling back to 1. Exception: ", e);
			return 1;
		}
	}

	private buildLookupKey(key: string, version: number) {
		if (Number.isNaN(version)) {
			version = 1;
		}

		return `${key}:${version}`;
	}

	/**
	 * @description Get the versioned key lookup for a given key
	 * @param key
	 * @param namespace
	 * @returns {Promise<string>} versioned key
	 */
	async getOrSetVersionedKeyLookup(
		key: string,
		namespace?: string,
	): Promise<string> {
		const currentVersion = await this.getCurrentVersion(namespace ?? key);
		return this.buildLookupKey(key, currentVersion);
	}

	/**
	 * @description Invalidate the current version for a given key
	 * @param key
	 * @returns {Promise<number>} new version
	 */
	async invalidate(key: string): Promise<number> {
		const versionKey = generateVersionLookupKey(key);
		const current = await this.getCurrentVersion(key);
		const newVersion = current + 1;
		await this.level.set(versionKey, newVersion, SEVEN_DAYS_IN_SECONDS);
		return newVersion;
	}

	/**
	 * Get with version to prevent extra lookup latency
	 */
	async getWithVersion<T>(
		key: string,
		version: number,
		value?: (() => Promise<T>) | T,
		ttl?: number,
		namespace?: string,
	) {
		const versionedKey = this.buildLookupKey(key, version);
		return this.level.get(versionedKey, value, ttl, namespace);
	}

	/**
	 * Set with version to prevent extra lookup latency
	 * @param key
	 * @param value
	 * @param version
	 * @param ttl
	 */
	async setWithVersion<T>(
		key: string,
		value: T,
		version: number = 1,
		ttl?: number,
	) {
		const versionedKey = this.buildLookupKey(key, version);

		return await this.level.set(versionedKey, value, ttl);
	}

	/**
	 * @description Get the value for a given key
	 * @param key - cache key
	 * @param value - optional value or function to get the value
	 * @param ttl - optional time to live
	 * @param namespace - optional namespace for versioning
	 * @returns {Promise<T | null>} value
	 */
	async get<T>(
		key: string,
		value?: (() => Promise<T>) | T,
		ttl?: number,
		namespace?: string,
	): Promise<T | null> {
		const versionedKey = await this.getOrSetVersionedKeyLookup(key, namespace);
		return this.level.get<T>(versionedKey, value, ttl);
	}

	async set<T>(key: string, value: T, ttl?: number, namespace?: string) {
		const versionedKey = await this.getOrSetVersionedKeyLookup(key, namespace);
		await this.level.set<T>(versionedKey, value, ttl);

		const version = this.retrieveVersionFromKey(versionedKey);
		return version;
	}

	async del(key: string, namespace?: string) {
		const versionedKey = await this.getOrSetVersionedKeyLookup(key, namespace);
		await this.level.del(versionedKey);

		const version = this.retrieveVersionFromKey(versionedKey);
		return version;
	}

	private retrieveVersionFromKey(versionedKey: string): string | undefined {
		const splitKey = versionedKey.split(":");
		const version = splitKey[splitKey.length - 1];
		return version;
	}
}
