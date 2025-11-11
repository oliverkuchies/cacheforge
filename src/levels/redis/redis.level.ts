import { Redlock } from "@sesamecare-oss/redlock";
import type IoRedis from "ioredis";
import type { Cluster } from "ioredis";
import { DEFAULT_TTL } from "../../constants";
import { parseIfJSON } from "../../utils/cache.utils";
import { deserialize, serialize } from "../../utils/parsing.utils";
import { generateVersionLookupKey } from "../../utils/version.utils";
import { type CacheLevel, CacheType } from "../interfaces/cache-level";
import type { Lockable } from "../interfaces/lockable";

export class RedisCacheLevel implements CacheLevel, Lockable {
	private client: IoRedis | Cluster;

	public cacheType: CacheType = CacheType.DISTRIBUTED;

	constructor(client: IoRedis | Cluster) {
		this.client = client;
	}

	/**
	 *
	 * @param key - cache key
	 * @param valueGetter - function to get the value if not present in cache
	 * @param ttl - time to live in seconds
	 * @param namespace - used to group related cache entries for easier invalidation
	 * @returns
	 */
	/**
	 * Retrieves a value from Redis by key and parses it if it's JSON.
	 * @param key - Cache key
	 * @returns Parsed value of type T or undefined if not found
	 */
	async get<T>(key: string): Promise<T> {
		const cachedValue = (await this.client.get(key)) as T;
		return parseIfJSON<T>(cachedValue);
	}

	/**
	 * Sets multiple key-value pairs in Redis using a pipeline for efficiency.
	 * @param keys - Array of cache keys
	 * @param values - Array of values to cache
	 * @param ttl - Time to live in seconds
	 * @returns Array of values that were set
	 */
	async mset<T>(keys: string[], values: T[], ttl = DEFAULT_TTL): Promise<T[]> {
		const pipeline = this.client.pipeline();
		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			const value = values[i];
			pipeline.set(key, serialize(value), "EX", ttl);
		}
		await pipeline.exec();
		return values;
	}

	/**
	 * Retrieves multiple values from Redis by their keys and deserializes them.
	 * @param keys - Array of cache keys
	 * @returns Array of values of type T (undefined if not found)
	 */
	async mget<T>(keys: string[]): Promise<T[]> {
		const results = await this.client.mget(...keys);
		const finalResults: T[] = [];
		for (let i = 0; i < keys.length; i++) {
			const cachedValue = results[i] as never;
			if (cachedValue === null || cachedValue === undefined) {
				finalResults.push(undefined as T);
			} else {
				finalResults.push(deserialize(cachedValue));
			}
		}
		return finalResults;
	}

	/**
	 * Sets a single key-value pair in Redis with a TTL.
	 * @param key - Cache key
	 * @param value - Value to cache
	 * @param ttl - Time to live in seconds
	 * @returns Parsed value of type T
	 */
	async set<T>(key: string, value: T, ttl = DEFAULT_TTL) {
		await this.client.set(key, serialize(value), "EX", ttl);
		return parseIfJSON(value) as T;
	}

	/**
	 * Deletes a key and its version lookup key from Redis.
	 * @param key - Cache key to delete
	 */
	async del(key: string) {
		await this.client.del(key);
		const versionKey = generateVersionLookupKey(key);
		await this.client.del(versionKey);
	}

	/**
	 * Deletes multiple keys from Redis.
	 * @param keys - Array of cache keys to delete
	 */
	async mdel(keys: string[]) {
		await this.client.del(...keys);
	}

	/**
	 * Acquires a distributed lock for a key, executes a callback, and releases the lock.
	 * Uses Redlock for distributed locking.
	 * @param key - Cache key to lock
	 * @param callback - Function to execute while holding the lock
	 * @param ttl - Time to live for the lock in seconds
	 * @returns Result of the callback function
	 */
	async lock<T>(key: string, callback: () => Promise<T>, ttl = 30): Promise<T> {
		const redlockClient = new Redlock([this.client], {
			driftFactor: 0.01,
			retryCount: 10,
			retryDelay: 200,
			retryJitter: 200,
			automaticExtensionThreshold: 500,
		});
		const lock = await redlockClient.acquire([`lock:${key}`], ttl * 1000);
		try {
			const result = await callback();
			return result;
		} finally {
			await lock.release();
		}
	}

	/**
	 * Flushes all keys from Redis. Not recommended for production use in large datasets as it can be slow and blocking.
	 */
	async flushAll(): Promise<void> {
		await this.client.flushall();
	}
}
