

# Multicache

**Multicache** is your all-in-one, flexible multi-level cache library for Node.js/TypeScript. Effortlessly combine blazing-fast in-memory caching with robust Redis support, versioning, and plug-and-play strategies for eviction and memory management.

## Features

- **Multi-level cache:** Seamlessly combine memory, Redis, and other cache backends
- **Pluggable eviction policies:** Use built-in (first-expiring, LRU) or create your own
- **Smart memory management:** Choose from percentage-based, item count, or custom strategies
- **Versioned cache keys:** Invalidate and update safely, every time
- **Extensible by design:** Build your own cache levels, policies, and strategies
- **Battle-tested:** Comprehensive test suite with [testcontainers](https://www.testcontainers.org/)


## Why Multicache?

- **Performance meets reliability:** Get the speed of in-memory caching and the resilience of Redis, all in one package.
- **Plug-and-play extensibility:** Drop in your own eviction policies, memory strategies, or cache backends with minimal effort.
- **Safe versioning:** Never worry about stale data—versioned keys make invalidation a breeze.
- **Built for maintainers:** Modular, testable, and easy to extend for your next big project.
- **Perfect for learning:** Experiment, extend, and master caching concepts in a real-world codebase.


npm install multicache

## Getting Started

### Installation

```bash
npm install multicache
```

### Basic Usage

```typescript
import { CacheService } from './src/cache.service';
import { MemoryCacheLevel } from './src/levels/memory.level';
import { RedisCacheLevel } from './src/levels/redis.level';
import Redis from 'ioredis';

const memoryCache = new MemoryCacheLevel(/* strategy */);
const redisClient = new Redis();
const redisCache = new RedisCacheLevel(redisClient);

const cacheService = new CacheService([
  memoryCache,
  redisCache,
]);

await cacheService.set('myKey', 'myValue');
const value = await cacheService.get('myKey');
```


## Extending Multicache

Multicache is the wider software engineering community. Want to roll your own eviction policy, memory strategy, or cache backend? Go for it!

- **Custom eviction policies:** Implement the `MemoryEvictionPolicy` interface ([see here](src/policies/interfaces/memory-eviction.policy.ts)).
- **Your own memory strategies:** Implement the `MemoryManagementStrategy` interface ([see here](src/strategies/interfaces/memory-management-strategy.ts)).
- **New cache levels:** Implement the `CacheLevel` interface for file, distributed, or any other backend.
- **Custom versioning:** Swap in your own logic with the `Versioning` interface or extend the version manager.

#### Example: Custom Eviction Policy

```typescript
import { MemoryEvictionPolicy } from './src/policies/interfaces/memory-eviction.policy';

class MyCustomEvictionPolicy implements MemoryEvictionPolicy {
	async evict(memoryCache) {
		// Your custom logic here
	}
}
```

#### Example: Custom Memory Management Strategy

```typescript
import { MemoryManagementStrategy } from './src/strategies/interfaces/memory-management-strategy';

class MyCustomStrategy implements MemoryManagementStrategy {
	checkCondition(memory) {
		// Your custom logic here
	}
	async execute(memory) {
		// Your custom logic here
	}
}
```

npm run test

## Testing

Multicache is covered by a robust test suite using [Vitest](https://vitest.dev/) and [testcontainers](https://www.testcontainers.org/) for integration tests.

To run all tests:

```bash
npm run test
```


## Contributing

Contributions are always welcome! Found a bug, have an idea, or want to add a new feature? Open an issue or pull request and join the fun.


## License

MIT

---

**TODOs:**
- Support Redis cluster
- Check namespace implementation
- When the application hits Redis, ensure the value is cached in the memory layer
- Remove eviction policy execute and use condition only, allow multiple strategies / policies
- Better error handling