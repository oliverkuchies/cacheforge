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

const TOTAL_CALLS = 10000;
let redisContainer: StartedRedisContainer;
let redisClient: Redis;
let redisOnlyClient: Redis;
let multiLevelCache: CacheService;
let redisOnlyCache: CacheService;
let memoryOnlyCache: MemoryCacheLevel;

async function setup() {
  redisContainer = await new RedisContainer('redis:7.2').start();
  redisClient = new Redis(redisContainer.getConnectionUrl());
  redisOnlyClient = new Redis(redisContainer.getConnectionUrl());

   memoryOnlyCache = new MemoryCacheLevel({
    memoryStrategies: [],
    evictionPolicy: new FirstExpiringMemoryPolicy(),
  });
  const redisLevel = new RedisCacheLevel(redisClient);
  multiLevelCache = new CacheService({
    levels: [memoryOnlyCache, redisLevel],
    defaultTTL: 3600,
  });

  const redisOnlyLevel = new RedisCacheLevel(redisOnlyClient);
  redisOnlyCache = new CacheService({
    levels: [redisOnlyLevel],
    defaultTTL: 3600,
  });
}

async function teardown() {
  await redisClient.quit();
  await redisOnlyClient.quit();
  await redisContainer.stop();
}

setup().then(() => {
  benny.suite(
    'Cache Write Performance',
    benny.add('Multi-Level Cache', async () => {
      const keyIndex = Math.floor(Math.random() * TOTAL_CALLS);
      const key = `speed_test_key_${keyIndex}`;
      await multiLevelCache.set(key, { id: keyIndex, data: `test_data_${keyIndex}` });
    }),
    benny.add('Redis-Only Cache', async () => {
      const keyIndex = Math.floor(Math.random() * TOTAL_CALLS);
      const key = `speed_test_key_${keyIndex}`;
      await redisOnlyCache.set(key, { id: keyIndex, data: `test_data_${keyIndex}` });
    }),
    benny.cycle(),
    benny.complete(async () => {
      await teardown();
    }),
    benny.save({ file: 'cache-write-performance', format: 'json' })
  );
});
