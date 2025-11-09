[![npm version](https://img.shields.io/npm/v/cacheforge.svg)](https://www.npmjs.com/package/cacheforge)
[![npm downloads](https://img.shields.io/npm/dm/cacheforge.svg)](https://www.npmjs.com/package/cacheforge)
[![Build Status](https://github.com/oliverkuchies/cacheforge/actions/workflows/main.yml/badge.svg)](https://github.com/oliverkuchies/cacheforge/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

# cacheforge

**cacheforge** is a flexible, multi-level cache library for Node.js and TypeScript that combines the speed of in-memory caching with the persistence of Redis. 

Built with extensibility in mind, it features pluggable eviction policies, memory management strategies, and safe versioning for cache invalidation.

It utilizes a leveling framework, ensuring that Level 1 is always accessed before Level 2 in the cache hierarchy.

- Level 1 might be an in-memory cache, offering faster reads and reducing latency.
- Level 2 could be a remote cache such as Redis or Valkey, which serves as a secondary layer when data is not found in Level 1.

This approach reduces load on the lower-level cache and improves overall performance.

## Features

- **Multi-level caching:** Chain multiple cache backends (memory, Redis, or custom) for optimal performance
- **Pluggable eviction policies:** Built-in first-expiring policy with support for custom implementations
- **Smart memory management:** Percentage-based threshold strategies with extensibility for custom logic
- **Versioned cache keys:** Safe cache invalidation without race conditions
- **Distributed locking:** Redis-based locking via Redlock for critical sections
- **Type-safe:** Full TypeScript support with comprehensive type definitions
- **Battle-tested:** Comprehensive test suite using Vitest and Testcontainers

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
  - [Cache Levels](#cache-levels)
  - [Eviction Policies](#eviction-policies)
  - [Memory Management Strategies](#memory-management-strategies)
- [Usage Guide](#usage-guide)
  - [Basic Setup](#basic-setup)
  - [Memory-Only Cache](#memory-only-cache)
  - [Multi-Level Cache](#multi-level-cache)
  - [Versioned Caching](#versioned-caching)
  - [Distributed Locking](#distributed-locking)
- [Customization](#customization)
  - [Custom Cache Levels](#custom-cache-levels)
  - [Custom Eviction Policies](#custom-eviction-policies)
  - [Custom Memory Strategies](#custom-memory-strategies)
- [API Reference](#api-reference)
- [Best Practices](#best-practices)
- [Testing](#testing)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install cacheforge ioredis
```

**Note:** `ioredis` is required if you plan to use the Redis cache level. For memory-only caching, it can be omitted.

## Quick Start

Here's a minimal example to get you started:

```typescript
import {
  CacheService,
  MemoryCacheLevel,
  FirstExpiringMemoryPolicy,
  RamPercentageLimitStrategy
} from 'cacheforge';

// Create memory cache with eviction policy and strategy
const memoryCache = new MemoryCacheLevel({
  memoryStrategies: [new RamPercentageLimitStrategy(80)], // Trigger at 80% memory
  evictionPolicy: new FirstExpiringMemoryPolicy()
});

// Create cache service
const cache = new CacheService({
  levels: [memoryCache],
  defaultTTL: 3600 // 1 hour in seconds
});

// Store and retrieve data
await cache.set('user:123', { name: 'John Doe', email: 'john@example.com' });
const user = await cache.get('user:123');
console.log(user); // { name: 'John Doe', email: 'john@example.com' }
```

## Core Concepts

### Cache Levels

Cache levels represent different storage backends in your caching hierarchy. cacheforge queries levels in order and returns the first hit, promoting cache locality.

At the top (CacheService), fallbacks are handled. However the added layers do not have fallback logic to reduce complexity.

**Built-in Levels:**

#### MemoryCacheLevel
Fast, in-memory caching using a Map and min-heap for efficient expiration tracking.

```typescript
import { MemoryCacheLevel, FirstExpiringMemoryPolicy, RamPercentageLimitStrategy } from 'cacheforge';

const memoryCache = new MemoryCacheLevel({
  memoryStrategies: [
    new RamPercentageLimitStrategy(75) // Evict when memory exceeds 75%
  ],
  evictionPolicy: new FirstExpiringMemoryPolicy()
});
```

#### RedisCacheLevel
Persistent caching backed by Redis with support for distributed locking.

```typescript
import { RedisCacheLevel } from 'cacheforge';
import Redis from 'ioredis';

const redisClient = new Redis({
  host: 'localhost',
  port: 6379
});

const redisCache = new RedisCacheLevel(redisClient);
```

### Eviction Policies

Eviction policies determine which items to remove when memory constraints are exceeded.

#### FirstExpiringMemoryPolicy
Removes items closest to expiration first (10% of cache at a time).

```typescript
import { FirstExpiringMemoryPolicy } from 'cacheforge';

const policy = new FirstExpiringMemoryPolicy();
```

### Memory Management Strategies

Strategies check conditions and trigger eviction policies when thresholds are met.

#### MemorySizeLimitStrategy (Recommended Default)
Triggers eviction when the total size of items in the cache exceeds a defined threshold (as a percentage of the Node.js process heap).

This strategy is recommended as the default for most applications, as it provides a more accurate measurement of cache memory usage and helps prevent out-of-memory errors.

```typescript
import { MemorySizeLimitStrategy } from 'cacheforge';

// Trigger eviction when cache uses 10% or more of Node.js heap
const strategy = new MemorySizeLimitStrategy(10);
```

#### RamPercentageLimitStrategy
Triggers eviction when system memory usage exceeds a percentage threshold.

```typescript
import { RamPercentageLimitStrategy } from 'cacheforge';

// Trigger eviction at 80% memory usage
const strategy = new RamPercentageLimitStrategy(80);
```

## Usage Guide

### Basic Setup

#### Memory-Only Cache

```typescript
import {
  CacheService,
  MemoryCacheLevel,
  FirstExpiringMemoryPolicy,
  RamPercentageLimitStrategy
} from 'cacheforge';

const cache = new CacheService({
  levels: [
    new MemoryCacheLevel({
      memoryStrategies: [new RamPercentageLimitStrategy(80)],
      evictionPolicy: new FirstExpiringMemoryPolicy()
    })
  ],
  defaultTTL: 3600 // 1 hour
});

// Set a value with default TTL
await cache.set('key', 'value');

// Set a value with custom TTL (in seconds)
await cache.set('session:abc', { userId: 123 }, 1800); // 30 minutes

// Get a value
const value = await cache.get('key');

// Delete a value
await cache.del('key');
```

### Multi-Level Cache

Combine memory and Redis for the best of both worlds: speed and persistence.

```typescript
import {
  CacheService,
  MemoryCacheLevel,
  RedisCacheLevel,
  FirstExpiringMemoryPolicy,
  RamPercentageLimitStrategy
} from 'cacheforge';
import Redis from 'ioredis';

const memoryCache = new MemoryCacheLevel({
  memoryStrategies: [new RamPercentageLimitStrategy(75)],
  evictionPolicy: new FirstExpiringMemoryPolicy()
});

const redisCache = new RedisCacheLevel(new Redis());

const cache = new CacheService({
  levels: [memoryCache, redisCache], // Order matters: memory first, Redis second
  defaultTTL: 3600
});

// This will be stored in both levels
await cache.set('product:42', { name: 'Widget', price: 19.99 });

// Get will check memory first, then Redis
const product = await cache.get('product:42');
```

### Versioned Caching

Versioning enables safe cache invalidation across distributed systems by appending version numbers to cache keys.

```typescript
import { CacheService, MemoryCacheLevel, RedisCacheLevel } from 'cacheforge';
import Redis from 'ioredis';

const cache = new CacheService({
  levels: [
    new MemoryCacheLevel({
      memoryStrategies: [new RamPercentageLimitStrategy(80)],
      evictionPolicy: new FirstExpiringMemoryPolicy()
    }),
    new RedisCacheLevel(new Redis())
  ],
  versioning: true, // Enable versioning
  defaultTTL: 3600
});

// Set versioned cache entry
await cache.set('user:123', { name: 'Alice' });
// Internally stored as: user:123:1

// Get versioned entry
const user = await cache.get('user:123'); // Returns { name: 'Alice' }

// Invalidate by incrementing version
await cache.invalidateKey('user:123');
// Version incremented to 2, old data at version 1 is now stale

// Subsequent gets return null until data is re-cached
const staleUser = await cache.get('user:123'); // Returns null
```

### Distributed Locking

Prevent race conditions in distributed systems with Redis-based locks.

```typescript
import { CacheService, RedisCacheLevel } from 'cacheforge';
import Redis from 'ioredis';

const cache = new CacheService({
  levels: [new RedisCacheLevel(new Redis())],
  defaultLockTTL: 30 // Default lock duration in seconds
});

// Execute callback with exclusive lock
const result = await cache.lock('critical-section:user:123', async () => {
  // Only one process can execute this code at a time
  const user = await cache.get('user:123');
  
  if (!user) {
    const freshData = await fetchFromDatabase();
    await cache.set('user:123', freshData);
    return freshData;
  }
  
  return user;
}, 60); // Lock expires after 60 seconds
```

### Lazy Loading Pattern

Use the `valueGetter` parameter for automatic cache population:

```typescript
// If key exists, returns cached value
// If key doesn't exist, calls the function, caches the result, and returns it
const user = await cache.get(
  'user:123',
  async () => {
    // This only runs if cache miss
    return await database.users.findById(123);
  },
  3600 // TTL in seconds
);
```

## Customization

### Custom Cache Levels

Implement the `CacheLevel` interface to add support for new backends (filesystem, database, etc.):

```typescript
import type { CacheLevel } from 'cacheforge';

export class FilesystemCacheLevel implements CacheLevel {
  constructor(private basePath: string) {}

  async get<T>(
    key: string,
    valueGetter?: (() => Promise<T>) | T,
    ttl?: number
  ): Promise<T | null> {
    const filePath = path.join(this.basePath, `${key}.json`);
    
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const cached = JSON.parse(data);
      
      if (Date.now() > cached.expiry) {
        await this.del(key);
        return null;
      }
      
      return cached.value;
    } catch (error) {
      if (valueGetter) {
        const value = valueGetter instanceof Function ? await valueGetter() : valueGetter;
        await this.set(key, value, ttl);
        return value;
      }
      return null;
    }
  }

  async set<T>(key: string, value: T, ttl: number = 3600): Promise<T | null> {
    const filePath = path.join(this.basePath, `${key}.json`);
    const data = {
      value,
      expiry: Date.now() + (ttl * 1000)
    };
    
    await fs.writeFile(filePath, JSON.stringify(data));
    return value;
  }

  async del(key: string): Promise<void> {
    const filePath = path.join(this.basePath, `${key}.json`);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      // File doesn't exist, ignore
    }
  }
}

// Use your custom level
const cache = new CacheService({
  levels: [new FilesystemCacheLevel('/tmp/cache')]
});
```

### Custom Eviction Policies

Create policies with different eviction algorithms (LRU, LFU, random, etc.):

```typescript
import type { MemoryEvictionPolicy } from 'cacheforge';
import type { InMemory } from 'cacheforge';

export class LRUEvictionPolicy<T> implements MemoryEvictionPolicy<T> {
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;

  async evict(cacheLevel: InMemory<T>): Promise<void> {
    const heap = cacheLevel.getHeap();
    const itemsToEvict = Math.ceil(heap.getCount() * 0.2); // Evict 20%
    
    // Sort by access order and remove least recently used
    const sortedKeys = Array.from(this.accessOrder.entries())
      .sort((a, b) => a[1] - b[1])
      .slice(0, itemsToEvict)
      .map(([key]) => key);
    
    for (const key of sortedKeys) {
      await cacheLevel.del(key);
      this.accessOrder.delete(key);
    }
  }

  trackAccess(key: string): void {
    this.accessOrder.set(key, this.accessCounter++);
  }
}
```

### Custom Memory Strategies

Build strategies based on item count, memory size, or custom metrics:

```typescript
import type { MemoryManagementStrategy } from 'cacheforge';
import type { InMemory } from 'cacheforge';

export class ItemCountLimitStrategy<T> implements MemoryManagementStrategy<T> {
  constructor(private maxItems: number) {}

  checkCondition(memory: InMemory<T>): boolean {
    const heap = memory.getHeap();
    return heap.getCount() > this.maxItems;
  }
}

// Usage
const cache = new MemoryCacheLevel({
  memoryStrategies: [new ItemCountLimitStrategy(10000)], // Max 10k items
  evictionPolicy: new FirstExpiringMemoryPolicy()
});
```

## API Reference

### CacheService

The main interface for interacting with the cache.

#### Constructor Options

```typescript
interface CacheServiceOptions {
  levels: CacheLevel[];          // Array of cache levels (checked in order)
  defaultTTL?: number;           // Default TTL in seconds (default: 3600)
  defaultLockTTL?: number;       // Default lock TTL in seconds (default: 30)
  versioning?: boolean;          // Enable versioned keys (default: false)
}
```

#### Methods

##### `get<T>(key: string, valueGetter?: () => Promise<T> | T, ttl?: number, namespace?: string): Promise<T | null>`

Retrieve a value from the cache. Checks each level in order.

- **key**: Cache key
- **valueGetter**: Optional function to generate value on cache miss
- **ttl**: Time to live in seconds (used if valueGetter populates cache)
- **namespace**: Versioning namespace (groups related keys)

##### `set<T>(key: string, value: T, ttl?: number, namespace?: string): Promise<void>`

Store a value in all cache levels.

- **key**: Cache key
- **value**: Value to store (will be JSON serialized for Redis)
- **ttl**: Time to live in seconds (default: defaultTTL)
- **namespace**: Versioning namespace

##### `del(key: string, namespace?: string): Promise<void>`

Delete a key from all cache levels.

##### `invalidateKey(key: string): Promise<void>`

Invalidate a versioned key by incrementing its version. Only works with `versioning: true`.

##### `lock<T>(key: string, callback: () => Promise<T>, ttl?: number): Promise<T>`

Acquire a distributed lock and execute a callback.

- **key**: Lock identifier
- **callback**: Function to execute while holding lock
- **ttl**: Lock expiration in seconds

### MemoryCacheLevel

#### Constructor Options

```typescript
interface MemoryLevelOptions<T> {
  memoryStrategies: MemoryManagementStrategy<T>[];  // Strategies to check
  evictionPolicy: MemoryEvictionPolicy;              // Policy to execute on eviction
}
```

#### Methods

Implements all `CacheLevel` methods plus:

##### `purge(): void`

Clear all cached items and reset the heap.

##### `getMemoryUsage(): number`

Get current system memory usage as a percentage.

##### `getHeap(): MemoryHeap<StoredHeapItem>`

Access the internal min-heap for debugging or custom operations.

### RedisCacheLevel

#### Constructor

```typescript
constructor(client: IoRedis | Cluster)
```

Takes an `ioredis` client or cluster instance.

## Best Practices

### 1. Layer Your Cache Appropriately

Place fastest, most expensive levels first:

```typescript
const cache = new CacheService({
  levels: [
    memoryCache,    // Fast, limited capacity
    redisCache,     // Slower, larger capacity
    // diskCache,   // Slowest, unlimited capacity (if implemented)
  ]
});
```

### 2. Choose TTLs Wisely

- **Short-lived data** (sessions, rate limits): 5-30 minutes
- **Medium-lived data** (user profiles, configs): 30 minutes - 2 hours
- **Long-lived data** (static content): 6-24 hours

### 3. Use Versioning for Complex Invalidation

When multiple keys are related, use namespaces:

```typescript
// Store with namespace
await cache.set('profile', userData, 3600, 'user:123');
await cache.set('preferences', userPrefs, 3600, 'user:123');

// Invalidate all keys in namespace
await cache.invalidateKey('user:123');
```

### 4. Memory Strategy Thresholds


- **Recommended Default:** Use `MemorySizeLimitStrategy` with a threshold of 10-20% of Node.js heap for most production workloads.
- **RamPercentageLimitStrategy:**
  - Development: 80-90% (more headroom)
  - Production: 70-75% (prevent OOM issues)

### 5. Distributed Locking

Always set appropriate lock TTLs to prevent deadlocks:

```typescript
// Good: TTL longer than expected execution time
await cache.lock('key', callback, 60); // For 30-second operation

// Bad: TTL too short
await cache.lock('key', callback, 1); // Lock may expire during execution
```

### 6. Error Handling

cacheforge fails gracefully—if one level fails, it continues to the next. Always handle cache misses:

```typescript
const data = await cache.get('key') || await fetchFromDatabase();
```

## Testing

cacheforge uses [Vitest](https://vitest.dev/) and [Testcontainers](https://www.testcontainers.org/) for comprehensive testing.

### Run Tests

```bash
# Run all tests with coverage
npm test

# Type checking
npm run typecheck

# Build
npm run build

# Lint
npm run lint

# Lint and fix
npm run lint:fix
```

### Writing Tests

Example test using the library:

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CacheService, MemoryCacheLevel, FirstExpiringMemoryPolicy, RamPercentageLimitStrategy } from 'cacheforge';

describe('Cache Service', () => {
  let cache: CacheService;

  beforeEach(() => {
    const memoryCache = new MemoryCacheLevel({
      memoryStrategies: [new RamPercentageLimitStrategy(80)],
      evictionPolicy: new FirstExpiringMemoryPolicy()
    });

    cache = new CacheService({ levels: [memoryCache] });
  });

  it('should store and retrieve values', async () => {
    await cache.set('test', 'value');
    const result = await cache.get('test');
    expect(result).toBe('value');
  });

  it('should handle cache misses with valueGetter', async () => {
    const result = await cache.get('missing', async () => 'generated', 60);
    expect(result).toBe('generated');
  });
});
```

## Contributing

Contributions are welcome! Here's how to get started:

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Create a feature branch**: `git checkout -b feature/my-feature`
4. **Make your changes** with tests
5. **Run tests**: `npm test`
6. **Commit your changes**: `git commit -am 'Add new feature'`
7. **Push to your fork**: `git push origin feature/my-feature`
8. **Open a Pull Request`

### Development Setup

```bash
git clone https://github.com/oliverkuchies/cacheforge.git
cd cacheforge
npm install
npm run build
npm test
```

## License

MIT License - see LICENSE file for details

---

## Roadmap

- [ ] LRU eviction policy implementation
- [ ] Metrics and observability hooks
- [ ] Additional cache backends (Memcached, DynamoDB)
- [ ] Cache stampede protection
- [ ] Compression support for large values
