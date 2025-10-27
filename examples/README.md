# Multicache Examples

This directory contains practical examples demonstrating various features of Multicache.

## Prerequisites

These examples use [tsx](https://github.com/privatenumber/tsx) to run TypeScript directly. Install it globally or use npx:

```bash
# Using npx (no installation needed)
npx tsx examples/basic-usage.ts

# Or install globally
npm install -g tsx
tsx examples/basic-usage.ts
```

## Available Examples

### 1. Basic Usage (`basic-usage.ts`)

Demonstrates fundamental Multicache operations:
- Creating a memory cache with eviction policies and strategies
- Setting and getting values
- Using custom TTL (Time To Live)
- Lazy loading with value getters (cache-aside pattern)
- Deleting keys

**Run:**
```bash
npx tsx examples/basic-usage.ts
```

### 2. Advanced Versioning (`advanced-versioning.ts`)

Shows how to use versioning for safe cache invalidation:
- Storing versioned cache entries
- Invalidating cache by version increment
- Re-caching after invalidation
- Using namespaces to group related cache entries
- Invalidating entire namespaces at once

**Run:**
```bash
npx tsx examples/advanced-versioning.ts
```

## Creating Your Own Examples

Feel free to create your own examples to explore Multicache features. Here's a template:

```typescript
import {
  CacheService,
  MemoryCacheLevel,
  FirstExpiringMemoryPolicy,
  MemoryPercentageLimitStrategy
} from 'multicache';

async function main() {
  const cache = new CacheService({
    levels: [
      new MemoryCacheLevel({
        memoryStrategies: [new MemoryPercentageLimitStrategy(80)],
        evictionPolicy: new FirstExpiringMemoryPolicy()
      })
    ]
  });

  // Your example code here
}

main().catch(console.error);
```

## More Examples Coming Soon

We're working on additional examples for:
- Multi-level caching with Redis
- Custom eviction policies
- Custom memory management strategies
- Distributed locking
- Custom cache levels
- Performance benchmarking

Contributions are welcome! Feel free to submit your own examples via pull request.
