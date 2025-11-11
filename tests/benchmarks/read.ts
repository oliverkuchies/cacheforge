import benny from 'benny';
import {
  RedisContainer,
  StartedRedisContainer,
} from '@testcontainers/redis';
import { Redis } from 'ioredis';
import { CacheService } from '../../src/cache.service';
import {
  MemoryCacheLevel,
  RedisCacheLevel,
} from '../../src/levels';
import { FirstExpiringMemoryPolicy } from '../../src/policies/first-expiring-memory.policy';
import { RamPercentageLimitStrategy } from '../../src/strategies/ram-percentage-limit.strategy';

const TOTAL_CALLS = 10000;
let redisContainer: StartedRedisContainer;
let redisClient: Redis;
let redisOnlyClient: Redis;
let multiLevelCache: CacheService;
let redisOnlyCache: CacheService;

async function setup() {
  redisContainer = await new RedisContainer('redis:7.2').start();
  redisClient = new Redis(redisContainer.getConnectionUrl());
  redisOnlyClient = new Redis(redisContainer.getConnectionUrl());

  const memoryLevel = new MemoryCacheLevel({
    memoryStrategies: [new RamPercentageLimitStrategy(80)],
    evictionPolicy: new FirstExpiringMemoryPolicy(),
  });
  const redisLevel = new RedisCacheLevel(redisClient);
  multiLevelCache = new CacheService({
    levels: [memoryLevel, redisLevel],
    defaultTTL: 3600,
  });

  const redisOnlyLevel = new RedisCacheLevel(redisOnlyClient);
  redisOnlyCache = new CacheService({
    levels: [redisOnlyLevel],
    defaultTTL: 3600,
  });

  // Pre-populate both caches
  for (let i = 0; i < TOTAL_CALLS; i++) {
    const key = `speed_test_key_${i}`;
    const value = { id: i, data: `test_data_${i}` };
    await multiLevelCache.set(key, value);
    await redisOnlyCache.set(key, value);
  }
}

async function teardown() {
  await redisClient.quit();
  await redisOnlyClient.quit();
  await redisContainer.stop();
}

setup().then(() => {
  benny.suite(
    'Cache Read Performance',
    benny.add('Multi-Level Cache', async () => {
      const keyIndex = Math.floor(Math.random() * TOTAL_CALLS);
      const key = `speed_test_key_${keyIndex}`;
      await multiLevelCache.get(key, null);
    }),
    benny.add('Redis-Only Cache', async () => {
      const keyIndex = Math.floor(Math.random() * TOTAL_CALLS);
      const key = `speed_test_key_${keyIndex}`;
      await redisOnlyCache.get(key, null);
    }),
    benny.cycle(),
    benny.complete(async () => {
      await teardown();
    }),
  );
});
