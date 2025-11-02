import type {
	MemoryCacheLevel,
	MemoryLevelOptions,
	StoredHeapItem,
} from "./memory.level";
import { onMemoryChange } from "./memory-event.manager";

export class EvictionManager {
	constructor(
		protected memoryLevel: MemoryCacheLevel,
		protected memoryLevelOptions: MemoryLevelOptions<StoredHeapItem>,
	) {
		this.registerMemoryChangeListener(memoryLevelOptions);
	}

	private async evictByStrategy(options: MemoryLevelOptions<StoredHeapItem>) {
		if (
			options.memoryStrategies.find((strategy) =>
				strategy.checkCondition(this.memoryLevel),
			)
		) {
			options.evictionPolicy.evict(this.memoryLevel);
		}
	}

	public registerMemoryChangeListener(
		options: MemoryLevelOptions<StoredHeapItem>,
	) {
		onMemoryChange(async () => {
			await this.evictExpiredItems();
			await this.evictByStrategy(options);
		});
	}

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
