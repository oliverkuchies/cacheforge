/**
 * Example usage of Multicache
 * 
 * Run this file with: npx tsx examples/basic-usage.ts
 * 
 * Note: When using multicache in your project, import from 'multicache':
 * import { CacheService, MemoryCacheLevel, ... } from 'multicache';
 */

import {
  CacheService,
  MemoryCacheLevel,
  FirstExpiringMemoryPolicy,
  MemoryPercentageLimitStrategy
} from '../src'; // In production, use: from 'multicache'

async function main() {
  console.log('🚀 Multicache Example\n');

  // Create memory cache with eviction policy and strategy
  const memoryCache = new MemoryCacheLevel({
    memoryStrategies: [new MemoryPercentageLimitStrategy(80)],
    evictionPolicy: new FirstExpiringMemoryPolicy()
  });

  // Create cache service
  const cache = new CacheService({
    levels: [memoryCache],
    defaultTTL: 3600 // 1 hour in seconds
  });

  // Example 1: Basic set and get
  console.log('Example 1: Basic set and get');
  await cache.set('user:123', { name: 'John Doe', email: 'john@example.com' });
  const user = await cache.get('user:123');
  console.log('  Retrieved user:', user);
  console.log();

  // Example 2: Set with custom TTL
  console.log('Example 2: Set with custom TTL');
  await cache.set('session:abc', { userId: 123 }, 1800); // 30 minutes
  const session = await cache.get('session:abc');
  console.log('  Retrieved session:', session);
  console.log();

  // Example 3: Lazy loading with valueGetter
  console.log('Example 3: Lazy loading with valueGetter');
  const product = await cache.get(
    'product:42',
    async () => {
      console.log('  Cache miss! Fetching from "database"...');
      return { id: 42, name: 'Widget', price: 19.99 };
    },
    3600
  );
  console.log('  Retrieved product:', product);
  
  // Get again - should be cached now
  const productCached = await cache.get('product:42');
  console.log('  Retrieved product (cached):', productCached);
  console.log();

  // Example 4: Delete a key
  console.log('Example 4: Delete a key');
  await cache.del('user:123');
  const deletedUser = await cache.get('user:123');
  console.log('  User after deletion:', deletedUser); // null
  console.log();

  console.log('✅ All examples completed!');
}

main().catch(console.error);
