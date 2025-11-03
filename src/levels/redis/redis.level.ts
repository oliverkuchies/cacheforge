import { Redlock } from "@sesamecare-oss/redlock";
import type IoRedis from "ioredis";
import type { Cluster } from "ioredis";
import { DEFAULT_TTL } from "../../constants";
import { parseIfJSON } from "../../utils/cache.utils";
import {
	deserializeFromRedis,
	serializeForRedis,
} from "../../utils/parsing.utils";
import { generateVersionLookupKey } from "../../utils/version.utils";
import type { CacheLevel } from "../interfaces/cache-level";
import type { Lockable } from "../interfaces/lockable";

export class RedisCacheLevel implements CacheLevel, Lockable {
	private client: IoRedis | Cluster;

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
	async get<T>(key: string): Promise<T> {
		const cachedValue = (await this.client.get(key)) as T;

		return parseIfJSON<T>(cachedValue);
	}

	async mget<T>(keys: string[]): Promise<T[]> {
		const results = await this.client.mget(...keys);
		const finalResults: T[] = [];

		for (let i = 0; i < keys.length; i++) {
			const cachedValue = results[i] as never;

			if (cachedValue === null || cachedValue === undefined) {
				finalResults.push(undefined as T);
			} else {
				finalResults.push(deserializeFromRedis(cachedValue));
			}
		}

		return finalResults;
	}

	async set<T>(key: string, value: T, ttl = DEFAULT_TTL) {
		await this.client.set(key, serializeForRedis(value), "EX", ttl);

		return parseIfJSON(value) as T;
	}

	async del(key: string) {
		await this.client.del(key);
		const versionKey = generateVersionLookupKey(key);
		await this.client.del(versionKey);
	}

	async mdel(keys: string[]) {
		await this.client.del(...keys);
	}

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
	 * Not recommended for production use in large datasets
	 * as it can be slow and blocking.
	 */
	async flushAll(): Promise<void> {
		await this.client.flushall();
	}
}
