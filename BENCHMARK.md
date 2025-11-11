# CacheForge Performance Benchmarks

This document describes the performance benchmarks included in the CacheForge library to help you understand the performance characteristics of multi-level caching.

## Running the Benchmarks

To run the benchmarks, use the following command:

```bash
npm run benchmark
```

The benchmarks use [Testcontainers](https://www.testcontainers.org/) to automatically spin up a Redis instance, so you don't need to have Redis running locally.

## Benchmarks

### Read Performance

As expected, read performance for multi level cache is (99x) faster. This is due to the memory layer contributing to additional speed and being ready for each request.

    {
      "name": "Multi-Level Cache",
      "ops": 173913,
      "margin": 6.93,
      "percentSlower": 0
    },
    {
      "name": "Redis-Only Cache",
      "ops": 1621,
      "margin": 7.28,
      "percentSlower": 99.07
    }

### Write Performance

Multi level cache is 33% slower at the moment at writing as it is writing to memory.

  {
    "name": "Multi-Level Cache",
    "ops": 1002,
    "margin": 6.6,
    "percentSlower": 33.11
  },
  {
    "name": "Redis-Only Cache",
    "ops": 1498,
    "margin": 9.15,
    "percentSlower": 0
  }