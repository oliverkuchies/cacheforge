import { Redis } from 'ioredis';
import { CacheService } from '../../src/cache.service';
import { MemoryCacheLevel, RedisCacheLevel } from '../../src/levels';
import { FirstExpiringMemoryPolicy } from '../../src/policies/first-expiring-memory.policy';
import { RamPercentageLimitStrategy } from '../../src/strategies/ram-percentage-limit.strategy';
import type { StoredHeapItem } from '../../src/levels/memory/memory.level';

export function createMemoryLevel(): MemoryCacheLevel {
  return new MemoryCacheLevel({
    memoryStrategies: [new RamPercentageLimitStrategy<StoredHeapItem>(80)],
    evictionPolicy: new FirstExpiringMemoryPolicy(),
  });
}

export function createRedisLevel(redisClient: Redis): RedisCacheLevel {
  return new RedisCacheLevel(redisClient);
}

export function createMultiLevelCache(memoryLevel: MemoryCacheLevel, redisLevel: RedisCacheLevel): CacheService {
  return new CacheService({
    levels: [memoryLevel, redisLevel],
    defaultTTL: 3600,
  });
}

export async function prepopulateCache(cache: CacheService, uniqueKeys: number, valueFactory: (i: number) => any) {
  for (let i = 0; i < uniqueKeys; i++) {
    const key = `benchmark_key_${i}`;
    const value = valueFactory(i);
    await cache.set(key, value);
  }
}
