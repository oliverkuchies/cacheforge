import os from "node:os";
import { DEFAULT_TTL } from "../../constants";
import type { AbstractMemoryEvictionPolicy } from "../../policies/abstract/abstract-memory-eviction.policy";
import type { MemoryManagementStrategy } from "../../strategies/interfaces/memory-management-strategy";
import { createCacheHeap } from "../../utils/heap.utils";
import { serialize } from "../../utils/parsing.utils";
import { type CacheLevel, CacheType } from "../interfaces/cache-level";
import type { InMemory } from "../interfaces/in-memory";
import type { Purgable } from "../interfaces/purgable";
import { EvictionManager } from "./eviction-manager";
import { triggerMemoryChange } from "./memory-event.manager";
export interface StoredItem {
	value: unknown;
	expiry: number;
}

export interface StoredHeapItem extends StoredItem {
	key: string;
}

export interface MemoryLevelOptions<T> {
	memoryStrategies: MemoryManagementStrategy<T>[];
	evictionPolicy: AbstractMemoryEvictionPolicy;
}

export class MemoryCacheLevel
	implements CacheLevel, Purgable, InMemory<StoredHeapItem>
{
	public cacheType: CacheType.MEMORY = CacheType.MEMORY;

	protected store = new Map<string, StoredItem>();
	protected size = 0;
	protected heap = createCacheHeap<StoredHeapItem>((item) => item.expiry);
	protected evictionManager: EvictionManager;

	constructor(options: MemoryLevelOptions<StoredHeapItem>) {
		this.evictionManager = new EvictionManager(this, options);
	}

	/**
	 * Delete multiple values from the cache.
	 * @param keys The cache keys.
	 * @return void
	 */
	public async mdel(keys: string[]): Promise<void> {
		const deletePromises: Promise<void>[] = [];
		for (const key of keys) {
			deletePromises.push(this.del(key));
		}
		await Promise.all(deletePromises);
	}

	/**
	 * Update the cache store with a new item.
	 * @param key The cache key.
	 * @param item The item to store.
	 */
	private async updateStore(key: string, item: StoredItem) {
		this.store.set(key, item);
		this.heap.insert({ ...item, key });
		this.size += serialize(item).length;
		triggerMemoryChange();
	}

	/**
	 * Get the current size of the cache store in bytes.
	 * @returns The size of the cache store.
	 */
	public getStoreSize(): number {
		return this.size;
	}

	/**
	 * Store multiple values in the cache.
	 * @param keys The cache keys.
	 * @param values The values to cache.
	 * @param ttl Time to live in seconds.
	 * @returns The cached values.
	 */
	async mset<T>(
		keys: string[],
		values: T[],
		ttl: number = DEFAULT_TTL,
	): Promise<T[]> {
		await Promise.allSettled(
			keys.map((key, index) => {
				const value = values[index];
				const expiryDate = Date.now() + ttl * 1000;
				const storedItem = { value, expiry: expiryDate };
				this.updateStore(key, storedItem);

				return Promise.resolve();
			}),
		);

		return values;
	}

	/**
	 * Retrieve multiple values from the cache.
	 * @param key The cache key.
	 * @returns The cached value or null if not found.
	 */
	async mget<T>(key: string[]): Promise<T[]> {
		const results: T[] = [];
		for (const k of key) {
			const cachedValue = this.store.get(k) as StoredItem | undefined;

			if (cachedValue === null || cachedValue === undefined) {
				results.push(cachedValue as T);
			} else {
				results.push(cachedValue.value as T);
			}
		}
		return results;
	}

	/**
	 * Retrieve a value from the cache.
	 * @param key The cache key.
	 * @returns The cached value or null if not found.
	 */
	async get<T>(key: string): Promise<T> {
		await this.evictionManager.evictExpiredItems();

		const cachedValue = this.store.get(key) as StoredItem | undefined;

		return cachedValue?.value as T;
	}

	/**
	 * Store a value in the cache.
	 * @param key The cache key.
	 * @param value The value to cache.
	 * @param ttl Time to live in seconds.
	 * @returns The cached value.
	 */
	async set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<T> {
		const expiryDate = Date.now() + ttl * 1000;
		const storedItem = { value, expiry: expiryDate };
		await this.updateStore(key, storedItem);

		return value as T;
	}

	/**
	 * Delete a value from the cache.
	 * @param key The cache key.
	 * @return void
	 */
	async del(key: string): Promise<void> {
		this.store.delete(key);
	}

	/**
	 * Purge all items from the cache.
	 * @return void
	 */
	purge(): void {
		this.heap.clear();
		this.store.clear();
	}

	/**
	 * Get the current memory usage percentage.
	 * @return Memory usage percentage.
	 */
	getMemoryUsage(): number {
		const memoryAvailable = os.totalmem() - os.freemem();
		return (memoryAvailable / os.totalmem()) * 100;
	}

	/**
	 * Get the cache heap.
	 * @return The cache heap.
	 */
	getHeap() {
		return this.heap;
	}

	/**
	 * Flush all items from the cache.
	 * @return Promise that resolves when the operation is complete.
	 */

	flushAll(): Promise<void> {
		this.purge();
		return Promise.resolve();
	}
}
