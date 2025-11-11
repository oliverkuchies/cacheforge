
import type {
  MemoryCacheLevel,
  MemoryLevelOptions,
  StoredHeapItem,
} from "./memory.level";
import { onMemoryChange } from "./memory-event.manager";

export class EvictionManager {
	/**
	 * Constructs an EvictionManager for a given memory cache level and options.
	 * Registers a listener for memory changes to trigger eviction.
	 * @param memoryLevel - The memory cache level instance
	 * @param memoryLevelOptions - Options including strategies and eviction policy
	 */
	constructor(
		protected memoryLevel: MemoryCacheLevel,
		protected memoryLevelOptions: MemoryLevelOptions<StoredHeapItem>,
	) {
		this.registerMemoryChangeListener(memoryLevelOptions);
	}

		/**
		 * Evicts items from memory based on custom strategies defined in options.
		 * If any strategy's condition is met, triggers the eviction policy.
		 * @param options - Memory level options containing strategies and eviction policy
		 */
		private async evictByStrategy(options: MemoryLevelOptions<StoredHeapItem>) {
			if (
				options.memoryStrategies.find((strategy) =>
					strategy.checkCondition(this.memoryLevel),
				)
			) {
				options.evictionPolicy.evict(this.memoryLevel);
			}
		}

		/**
		 * Registers a listener to handle memory changes.
		 * On memory change, evicts expired items and applies eviction strategies.
		 * @param options - Memory level options
		 */
		public registerMemoryChangeListener(
			options: MemoryLevelOptions<StoredHeapItem>,
		) {
			onMemoryChange(async () => {
				await this.evictExpiredItems();
				await this.evictByStrategy(options);
			});
		}

		/**
		 * Evicts all expired items from the memory cache level.
		 * Removes items whose expiry timestamp is less than or equal to the current time.
		 */
		public async evictExpiredItems() {
			const now = Date.now();
			const evictedItems = [];
			while (this.memoryLevel.getHeap().size() > 0) {
				const item = this.memoryLevel.getHeap().top();

				if (item && item.expiry <= now) {
					this.memoryLevel.getHeap().pop();
					evictedItems.push(item.key);
				} else {
					break;
				}
			}

			if (evictedItems.length) {
				await this.memoryLevel.mdel(evictedItems);
			}
		}
}
