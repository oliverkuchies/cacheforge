# CacheForge Performance Benchmarks

This document describes the performance benchmarks included in the CacheForge library to help you understand the performance characteristics of multi-level caching.

## Running the Benchmarks

To run the benchmarks, use the following command:

```bash
npm run benchmark
```

The benchmarks use [Testcontainers](https://www.testcontainers.org/) to automatically spin up a Redis instance, so you don't need to have Redis running locally.

## Benchmark Suite

The benchmark suite includes four comprehensive tests that measure different aspects of cache performance:

### Benchmark 1: Cache Hit Rate Analysis

**Purpose:** Measures how effectively the in-memory cache prevents Redis calls in a realistic scenario.

**Methodology:**
- Executes 10,000 cache read operations
- Uses an 80/20 access pattern (80% of requests go to 20% of keys) which simulates real-world usage
- Tracks hits at the memory level vs. Redis level
- Measures cache misses

**Key Metrics:**
- Memory cache hit rate
- Redis cache hit rate  
- Cache miss rate
- Number of Redis calls prevented
- Performance metrics (latency, throughput)

**Expected Results:**
- Memory cache should handle nearly 100% of requests for hot keys
- Demonstrates massive reduction in Redis network calls
- Shows sub-millisecond average latency

**Example Output:**
```
Results:
  Total Calls: 10000
  Memory Cache Hits: 10000 (100.00%)
  Redis Cache Hits: 0 (0.00%)
  Cache Misses: 0 (0.00%)

  Performance Metrics:
    Total Duration: 62ms
    Average Latency: 0.01ms
    P50 Latency: 0ms
    P95 Latency: 0ms
    P99 Latency: 0ms
    Throughput: 161290.32 ops/sec

  Key Insights:
    - Memory cache prevented 10000 Redis calls
    - That's 100.00% reduction in Redis load
    - Redis was hit 0 times when memory cache missed
```

### Benchmark 2: Speed Comparison - Multi-Level vs Redis-Only

**Purpose:** Compares the overall performance of a multi-level cache (Memory + Redis) against a Redis-only cache.

**Methodology:**
- Tests both cache configurations with 10,000 read operations
- Uses random access pattern across 100 unique keys
- Measures latency distribution (P50, P95, P99)
- Calculates throughput in operations per second

**Key Metrics:**
- Total duration for all operations
- Average latency
- Latency percentiles (P50, P95, P99)
- Throughput (ops/sec)
- Performance improvement percentage

**Expected Results:**
- Multi-level cache should be 90%+ faster than Redis-only
- Demonstrates the value of in-memory caching for frequently accessed data
- Shows orders of magnitude improvement in throughput

**Example Output:**
```
Multi-Level Cache Results:
  Total Duration: 16ms
  Avg Latency: 0.00ms
  P50 Latency: 0ms
  P95 Latency: 0ms
  P99 Latency: 0ms
  Throughput: 625000.00 ops/sec

Redis-Only Cache Results:
  Total Duration: 6965ms
  Avg Latency: 0.70ms
  P50 Latency: 1ms
  P95 Latency: 1ms
  P99 Latency: 2ms
  Throughput: 1435.75 ops/sec

Performance Comparison:
  Multi-Level Cache is 99.77% FASTER overall
  Multi-Level Cache has 99.80% LOWER average latency
  Multi-Level Cache has 43431.25% HIGHER throughput
```

### Benchmark 3: Write Performance and Consistency

**Purpose:** Measures write performance and documents the trade-off between read and write performance.

**Methodology:**
- Executes 1,000 write operations for both cache types
- Measures write latency distribution
- Calculates write throughput

**Key Metrics:**
- Write latency (average, P50, P95)
- Write throughput
- Performance comparison between multi-level and Redis-only

**Expected Results:**
- Multi-level writes are slower (20-80%) than Redis-only
- This is expected as data must be written to both memory and Redis
- Documents the trade-off: slower writes for much faster reads

**Example Output:**
```
Multi-Level Cache Write Performance:
  Total Duration: 9338ms
  Avg Latency: 0.93ms
  P50 Latency: 1ms
  P95 Latency: 2ms
  P99 Latency: 2ms
  Throughput: 1070.89 ops/sec

Redis-Only Cache Write Performance:
  Total Duration: 5450ms
  Avg Latency: 0.54ms
  P50 Latency: 1ms
  P95 Latency: 1ms
  P99 Latency: 2ms
  Throughput: 1834.86 ops/sec

Write Performance Comparison:
  Multi-Level writes are 71.34% SLOWER than Redis-only
  This is expected as writes must update both memory and Redis layers
```

### Benchmark 4: Memory Efficiency Analysis

**Purpose:** Analyzes memory usage and efficiency of the in-memory cache layer.

**Methodology:**
- Populates cache with 100000 entries (~1KB each)
- Measures actual memory usage
- Calculates retention efficiency

**Key Metrics:**
- Number of items in memory cache
- Estimated memory usage
- Average memory per item
- Memory efficiency (retention rate)

**Expected Results:**
- Shows predictable memory usage based on cache size
- Demonstrates automatic eviction policy behavior
- Documents memory footprint for capacity planning

**Example Output:**
```
Memory Usage Statistics:
  Items in Memory Cache: 10000
  Estimated Memory Usage: ~9.54 MB
  Average Memory per Item: ~0.98 KB
  Memory Efficiency: 100.00% of written items retained

Memory Cache Benefits:
  - Fast in-memory access for frequently accessed items
  - Automatic eviction based on configured strategies
  - Reduces network latency for cache hits
  - Offloads Redis for better resource utilization
```

## Interpreting Results

### When Multi-Level Caching Excels

Multi-level caching provides the most benefit when:

1. **High Read-to-Write Ratio:** Applications with more reads than writes benefit from fast in-memory access
2. **Hot Data Sets:** When a small subset of data is accessed frequently (e.g., 80/20 pattern)
3. **Latency-Sensitive Operations:** When sub-millisecond response times are critical
4. **High Concurrency:** When many operations need to be handled simultaneously

### Trade-offs to Consider

1. **Write Performance:** Writes are slower as data must be written to both cache levels
2. **Memory Usage:** In-memory cache consumes application memory
3. **Consistency:** Requires careful management in distributed systems
4. **Complexity:** Additional layer adds operational complexity

## Performance Tips

1. **Tune Memory Strategies:** Adjust `MemoryPercentageLimitStrategy` threshold based on your application's memory profile
2. **Choose Appropriate TTL:** Set cache TTL values that balance freshness and hit rate
3. **Monitor Cache Metrics:** Track hit rates to optimize cache configuration
4. **Size Your Cache:** Use Benchmark 4 to estimate memory requirements

## System Requirements

- Node.js 16+
- Docker (for Testcontainers)
- At least 2GB RAM for running benchmarks

## Contributing

If you'd like to add additional benchmarks or improve existing ones, please:

1. Follow the existing benchmark structure
2. Use Testcontainers for infrastructure dependencies
3. Document expected results and methodology
4. Ensure benchmarks are reproducible

## License

MIT License - See LICENSE file for details
