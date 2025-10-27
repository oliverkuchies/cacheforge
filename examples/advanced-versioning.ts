/**
 * Advanced Multicache example with versioning
 * 
 * Run this file with: npx tsx examples/advanced-versioning.ts
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
  console.log('🚀 Advanced Multicache Example - Versioning\n');

  // Create cache with versioning enabled
  const memoryCache = new MemoryCacheLevel({
    memoryStrategies: [new MemoryPercentageLimitStrategy(80)],
    evictionPolicy: new FirstExpiringMemoryPolicy()
  });

  const cache = new CacheService({
    levels: [memoryCache],
    versioning: true,
    defaultTTL: 3600
  });

  // Example 1: Store versioned data
  console.log('Example 1: Versioned cache storage');
  await cache.set('user:123', { name: 'Alice', email: 'alice@example.com' });
  console.log('  Stored user data (internally stored as user:123:1)');
  
  const user = await cache.get('user:123');
  console.log('  Retrieved user:', user);
  console.log();

  // Example 2: Invalidate versioned cache
  console.log('Example 2: Cache invalidation with versioning');
  await cache.invalidateKey('user:123');
  console.log('  Invalidated user:123 (version incremented to 2)');
  
  const invalidatedUser = await cache.get('user:123');
  console.log('  Retrieved user after invalidation:', invalidatedUser); // Should be null
  console.log();

  // Example 3: Re-cache after invalidation
  console.log('Example 3: Re-caching after invalidation');
  await cache.set('user:123', { name: 'Alice Updated', email: 'alice.new@example.com' });
  console.log('  Stored updated user data (now at version 2)');
  
  const updatedUser = await cache.get('user:123');
  console.log('  Retrieved updated user:', updatedUser);
  console.log();

  // Example 4: Namespace-based versioning
  console.log('Example 4: Namespace-based versioning');
  await cache.set('profile', { bio: 'Engineer' }, 3600, 'user:456');
  await cache.set('settings', { theme: 'dark' }, 3600, 'user:456');
  console.log('  Stored multiple keys under namespace "user:456"');
  
  const profile = await cache.get('profile', undefined, undefined, 'user:456');
  const settings = await cache.get('settings', undefined, undefined, 'user:456');
  console.log('  Retrieved profile:', profile);
  console.log('  Retrieved settings:', settings);
  
  // Invalidate the entire namespace
  await cache.invalidateKey('user:456');
  console.log('  Invalidated entire namespace "user:456"');
  
  const profileAfter = await cache.get('profile', undefined, undefined, 'user:456');
  const settingsAfter = await cache.get('settings', undefined, undefined, 'user:456');
  console.log('  Profile after invalidation:', profileAfter); // null
  console.log('  Settings after invalidation:', settingsAfter); // null
  console.log();

  console.log('✅ All advanced examples completed!');
  console.log('\n💡 Versioning is useful for:');
  console.log('  - Invalidating related cache entries together');
  console.log('  - Avoiding stale data in distributed systems');
  console.log('  - Safe cache updates without race conditions');
}

main().catch(console.error);
