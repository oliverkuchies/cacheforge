import {
	RedisContainer,
	type StartedRedisContainer,
} from "@testcontainers/redis";
import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, it } from "vitest";
import { CacheService } from "../src/cache.service";
import {
	MemoryCacheLevel,
	RedisCacheLevel,
} from "../src/levels";
import { FirstExpiringMemoryPolicy } from "../src/policies/first-expiring-memory.policy";
import { MemoryPercentageLimitStrategy } from "../src/strategies/memory-percentage-limit.strategy";
import type { StoredHeapItem } from "../src/levels/memory/memory.level";
import {
	type BenchmarkResult,
	calculateLatencyStats,
	calculateThroughput,
	get8020KeyIndex,
	getUniformKeyIndex,
	instrumentMemoryCache,
	instrumentRedisCache,
	populateCache,
	runBenchmark,
} from "./utilities/benchmark.utilities";
import {
	printBenchmarkHeader,
	printBenchmarkResults,
	printCacheHitRateResults,
	printMemoryEfficiency,
	printPerformanceComparison,
	printWritePerformanceComparison,
} from "./utilities/benchmark-output.utilities";

const TOTAL_CALLS = 10000;

describe("Cache Performance Benchmarks", () => {
	let redisContainer: StartedRedisContainer;

	beforeAll(async () => {
		// Start Redis container
		redisContainer = await new RedisContainer("redis:7.2").start();
	}, 60000);

	afterAll(async () => {
		await redisContainer?.stop();
	});

	it("Benchmark 1: Cache Hit Rate Analysis - 10,000 calls with 80/20 access pattern", async () => {
		printBenchmarkHeader("BENCHMARK 1: CACHE HIT RATE ANALYSIS");

		// Create fresh cache instances for this test
		const redisClient = new Redis(redisContainer.getConnectionUrl());
		const memoryLevel = new MemoryCacheLevel({
			memoryStrategies: [new MemoryPercentageLimitStrategy<StoredHeapItem>(80)],
			evictionPolicy: new FirstExpiringMemoryPolicy(),
		});
		const redisLevel = new RedisCacheLevel(redisClient);
		const multiLevelCache = new CacheService({
			levels: [memoryLevel, redisLevel],
			defaultTTL: 3600,
		});

		// Pre-populate cache with data
		await populateCache(multiLevelCache, "benchmark_key", TOTAL_CALLS);

		// Wait a bit to ensure data is properly set
		await new Promise((resolve) => setTimeout(resolve, 100));

		// Set up hit/miss counters
		const memoryCacheHits = { count: 0 };
		const redisCacheHits = { count: 0 };
		const cacheMisses = { count: 0 };

		// Instrument cache levels to track hits
		instrumentMemoryCache(memoryLevel, memoryCacheHits);
		instrumentRedisCache(redisLevel, redisCacheHits, cacheMisses);

		// Run benchmark with 80/20 access pattern
		const { latencies, totalDuration } = await runBenchmark(async () => {
			const keyIndex = get8020KeyIndex(TOTAL_CALLS);
			const key = `benchmark_key_${keyIndex}`;
			await multiLevelCache.get(key, null);
		}, TOTAL_CALLS);

		// Calculate statistics
		const stats = calculateLatencyStats(latencies);
		const throughput = calculateThroughput(TOTAL_CALLS, totalDuration);

		const result: BenchmarkResult = {
			description: "Multi-Level Cache with 80/20 Access Pattern",
			totalCalls: TOTAL_CALLS,
			memoryCacheHits: memoryCacheHits.count,
			redisCacheHits: redisCacheHits.count,
			cacheMisses: cacheMisses.count,
			totalDuration,
			...stats,
			throughputOps: throughput,
		};

		// Print results
		printCacheHitRateResults(result);

		// Cleanup
		await redisClient.quit();
	}, 120000);

	it("Benchmark 2: Speed Comparison - Multi-Level vs Redis-Only", async () => {
		printBenchmarkHeader("BENCHMARK 2: SPEED COMPARISON");

		// Create fresh cache instances for this test
		const redisClient = new Redis(redisContainer.getConnectionUrl());
		const redisOnlyClient = new Redis(redisContainer.getConnectionUrl());
		
		const memoryLevel = new MemoryCacheLevel({
			memoryStrategies: [new MemoryPercentageLimitStrategy<StoredHeapItem>(80)],
			evictionPolicy: new FirstExpiringMemoryPolicy(),
		});
		const redisLevel = new RedisCacheLevel(redisClient);
		const multiLevelCache = new CacheService({
			levels: [memoryLevel, redisLevel],
			defaultTTL: 3600,
		});

		const redisOnlyLevel = new RedisCacheLevel(redisOnlyClient);
		const redisOnlyCache = new CacheService({
			levels: [redisOnlyLevel],
			defaultTTL: 3600,
		});

		const uniqueKeys = 100;

		// Pre-populate both caches
		await populateCache(multiLevelCache, "speed_test_key", uniqueKeys);
		await populateCache(redisOnlyCache, "speed_test_key", uniqueKeys);

		await new Promise((resolve) => setTimeout(resolve, 100));

		// Benchmark Multi-Level Cache
		console.log("Testing Multi-Level Cache (Memory + Redis)...");
		const multiLevelBenchmark = await runBenchmark(async () => {
			const keyIndex = getUniformKeyIndex(uniqueKeys);
			const key = `speed_test_key_${keyIndex}`;
			await multiLevelCache.get(key, null);
		}, TOTAL_CALLS);

		// Benchmark Redis-Only Cache
		console.log("Testing Redis-Only Cache...");
		const redisOnlyBenchmark = await runBenchmark(async () => {
			const keyIndex = getUniformKeyIndex(uniqueKeys);
			const key = `speed_test_key_${keyIndex}`;
			await redisOnlyCache.get(key, null);
		}, TOTAL_CALLS);

		// Calculate statistics
		const multiLevelStats = calculateLatencyStats(multiLevelBenchmark.latencies);
		const redisOnlyStats = calculateLatencyStats(redisOnlyBenchmark.latencies);

		const multiLevelResult: BenchmarkResult = {
			description: "Multi-Level Cache",
			totalCalls: TOTAL_CALLS,
			totalDuration: multiLevelBenchmark.totalDuration,
			...multiLevelStats,
			throughputOps: calculateThroughput(TOTAL_CALLS, multiLevelBenchmark.totalDuration),
		};

		const redisOnlyResult: BenchmarkResult = {
			description: "Redis-Only Cache",
			totalCalls: TOTAL_CALLS,
			totalDuration: redisOnlyBenchmark.totalDuration,
			...redisOnlyStats,
			throughputOps: calculateThroughput(TOTAL_CALLS, redisOnlyBenchmark.totalDuration),
		};

		// Print comparison
		printBenchmarkResults("Multi-Level Cache Results", multiLevelResult);
		printBenchmarkResults("Redis-Only Cache Results", redisOnlyResult);
		printPerformanceComparison(redisOnlyResult, multiLevelResult);

		// Cleanup
		await redisClient.quit();
		await redisOnlyClient.quit();
	}, 120000);

	it("Benchmark 3: Write Performance and Consistency", async () => {
		printBenchmarkHeader("BENCHMARK 3: WRITE PERFORMANCE");

		// Create fresh cache instances for this test
		const redisClient = new Redis(redisContainer.getConnectionUrl());
		const redisOnlyClient = new Redis(redisContainer.getConnectionUrl());
		
		const memoryLevel = new MemoryCacheLevel({
			memoryStrategies: [new MemoryPercentageLimitStrategy<StoredHeapItem>(80)],
			evictionPolicy: new FirstExpiringMemoryPolicy(),
		});
		const redisLevel = new RedisCacheLevel(redisClient);
		const multiLevelCache = new CacheService({
			levels: [memoryLevel, redisLevel],
			defaultTTL: 3600,
		});

		const redisOnlyLevel = new RedisCacheLevel(redisOnlyClient);
		const redisOnlyCache = new CacheService({
			levels: [redisOnlyLevel],
			defaultTTL: 3600,
		});

		// Benchmark Multi-Level Cache Writes
		console.log("Testing Multi-Level Cache writes...");
		const multiLevelBenchmark = await runBenchmark(async () => {
			const i = Math.floor(Math.random() * TOTAL_CALLS);
			const key = `write_test_key_${i}`;
			const value = { id: i, data: `write_data_${i}_${"x".repeat(100)}` };
			await multiLevelCache.set(key, value);
		}, TOTAL_CALLS);

		// Benchmark Redis-Only Cache Writes
		console.log("Testing Redis-Only Cache writes...");
		const redisOnlyBenchmark = await runBenchmark(async () => {
			const i = Math.floor(Math.random() * TOTAL_CALLS);
			const key = `write_test_key_redis_${i}`;
			const value = { id: i, data: `write_data_${i}_${"x".repeat(100)}` };
			await redisOnlyCache.set(key, value);
		}, TOTAL_CALLS);

		// Calculate statistics
		const multiLevelStats = calculateLatencyStats(multiLevelBenchmark.latencies);
		const redisOnlyStats = calculateLatencyStats(redisOnlyBenchmark.latencies);

		const multiLevelResult: BenchmarkResult = {
			description: "Multi-Level Cache",
			totalCalls: TOTAL_CALLS,
			totalDuration: multiLevelBenchmark.totalDuration,
			...multiLevelStats,
			throughputOps: calculateThroughput(TOTAL_CALLS, multiLevelBenchmark.totalDuration),
		};

		const redisOnlyResult: BenchmarkResult = {
			description: "Redis-Only Cache",
			totalCalls: TOTAL_CALLS,
			totalDuration: redisOnlyBenchmark.totalDuration,
			...redisOnlyStats,
			throughputOps: calculateThroughput(TOTAL_CALLS, redisOnlyBenchmark.totalDuration),
		};

		// Print results
		printBenchmarkResults("Multi-Level Cache Write Performance", multiLevelResult);
		printBenchmarkResults("Redis-Only Cache Write Performance", redisOnlyResult);
		printWritePerformanceComparison(multiLevelResult, redisOnlyResult);

		// Cleanup
		await redisClient.quit();
		await redisOnlyClient.quit();
	}, 120000);

	it("Benchmark 4: Memory Efficiency Analysis", async () => {
		printBenchmarkHeader("BENCHMARK 4: MEMORY EFFICIENCY");

		// Create fresh cache instance for this test
		const redisClient = new Redis(redisContainer.getConnectionUrl());
		const memoryLevel = new MemoryCacheLevel({
			memoryStrategies: [new MemoryPercentageLimitStrategy<StoredHeapItem>(80)],
			evictionPolicy: new FirstExpiringMemoryPolicy(),
		});
		const redisLevel = new RedisCacheLevel(redisClient);
		const multiLevelCache = new CacheService({
			levels: [memoryLevel, redisLevel],
			defaultTTL: 3600,
		});
		const totalKeys = TOTAL_CALLS;
		const valueSizeBytes = 1000; // ~1KB per value

		// Clear memory cache first
		memoryLevel.purge();

		console.log("Populating cache with test data...");
		await populateCache(multiLevelCache, "memory_test", totalKeys, valueSizeBytes);

		// Get memory usage info
		const heap = memoryLevel.getHeap();
		const itemCount = heap.getCount();
		const estimatedMemoryMB = (itemCount * valueSizeBytes) / 1024 / 1024;
		const avgMemoryPerItemKB = valueSizeBytes / 1024;

		// Print results
		printMemoryEfficiency(itemCount, totalKeys, estimatedMemoryMB, avgMemoryPerItemKB);

		// Cleanup
		await redisClient.quit();
	}, 120000);
});
