import os from "node:os";
import { DEFAULT_TTL } from "../../constants";
import type { AbstractMemoryEvictionPolicy } from "../../policies/abstract/abstract-memory-eviction.policy";
import type { MemoryManagementStrategy } from "../../strategies/interfaces/memory-management-strategy";
import { createCacheHeap } from "../../utils/heap.utils";
import type { CacheLevel } from "../interfaces/cache-level";
import type { InMemory } from "../interfaces/in-memory";
import type { Purgable } from "../interfaces/purgable";
import { MemoryEventManager } from "./memory-event.manager";
export interface StoredItem {
	value: unknown;
	expiry: number;
}

export interface StoredHeapItem extends StoredItem {
	key: string;
}

interface MemoryLevelOptions<T> {
	memoryStrategies: MemoryManagementStrategy<T>[];
	evictionPolicy: AbstractMemoryEvictionPolicy;
}

export class MemoryCacheLevel
	implements CacheLevel, Purgable, InMemory<StoredHeapItem>
{
	protected store = new Map<string, StoredItem>();
	protected heap = createCacheHeap<StoredHeapItem>((item) => item.expiry);

	constructor(options: MemoryLevelOptions<StoredHeapItem>) {
		this.registerMemoryChangeListener(options);
	}

	private registerMemoryChangeListener(
		options: MemoryLevelOptions<StoredHeapItem>,
	) {
		MemoryEventManager.onMemoryChange(() => {
			if (
				options.memoryStrategies.find((strategy) =>
					strategy.checkCondition(this),
				)
			) {
				options.evictionPolicy.evict(this);
			}
		});
	}

	private insertHeapItem(item: StoredHeapItem) {
		this.heap.insert(item);
	}

	private updateStore(key: string, item: StoredItem) {
		MemoryEventManager.triggerMemoryChange();
		this.store.set(key, item);
		this.insertHeapItem({ ...item, key });
	}

	async get<T>(
		key: string,
		value?: (() => Promise<T>) | T,
		ttl?: number,
	): Promise<T | null> {
		const cachedValue = this.store.get(key) as StoredItem | undefined;
		if (cachedValue === null || cachedValue === undefined) {
			let newValue: unknown;

			if (value instanceof Function) {
				newValue = await value();
			} else {
				newValue = value;
			}

			await this.set(key, newValue, ttl);
			return newValue as T;
		}
		return cachedValue.value as T;
	}
	set<T>(key: string, value: T, ttl: number = DEFAULT_TTL): Promise<T | null> {
		const expiryDate = Date.now() + ttl;

		const storedItem = { value, expiry: expiryDate };
		this.updateStore(key, storedItem);

		return Promise.resolve(value as T);
	}
	del(key: string): Promise<void> {
		this.store.delete(key);
		return Promise.resolve();
	}
	purge(): void {
		this.heap.clear();
		this.store.clear();
	}
	getMemoryUsage(): number {
		const memoryAvailable = os.totalmem() - os.freemem();
		return (memoryAvailable / os.totalmem()) * 100;
	}
	getHeap() {
		return this.heap;
	}
}
