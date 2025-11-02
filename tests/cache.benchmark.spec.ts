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

interface BenchmarkResult {
	description: string;
	totalCalls: number;
	memoryCacheHits?: number;
	redisCacheHits?: number;
	cacheMisses?: number;
	totalDuration: number;
	avgLatencyMs: number;
	p50LatencyMs: number;
	p95LatencyMs: number;
	p99LatencyMs: number;
	throughputOps: number;
}

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
		console.log("\n========================================");
		console.log("BENCHMARK 1: CACHE HIT RATE ANALYSIS");
		console.log("========================================\n");

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

		const totalCalls = 10000;
		const uniqueKeys = 100; // Total unique keys
		const hotKeys = 20; // 20% of keys that will account for 80% of requests

		// Pre-populate cache with data
		const testData: Record<string, { id: number; data: string }> = {};
		for (let i = 0; i < uniqueKeys; i++) {
			const key = `benchmark_key_${i}`;
			const value = { id: i, data: `test_data_${i}_${"x".repeat(100)}` };
			testData[key] = value;
			await multiLevelCache.set(key, value);
		}

		// Wait a bit to ensure data is properly set
		await new Promise((resolve) => setTimeout(resolve, 100));

		let memoryCacheHits = 0;
		let redisCacheHits = 0;
		let cacheMisses = 0;

		// Create instrumented versions to track hits
		const originalMemoryGet = memoryLevel.get.bind(memoryLevel);
		const instrumentedMemoryGet = async function <T>(
			key: string,
			valueGetter?: (() => Promise<T>) | T,
			ttl?: number,
		): Promise<T | null> {
			const result = await originalMemoryGet(key, valueGetter, ttl);
			if (result !== null && result !== undefined) {
				memoryCacheHits++;
			}
			return result;
		};
		memoryLevel.get = instrumentedMemoryGet as any;

		const originalRedisGet = redisLevel.get.bind(redisLevel);
		const instrumentedRedisGet = async function <T>(
			key: string,
			valueGetter?: (() => Promise<T>) | T,
			ttl?: number,
		): Promise<T | null> {
			const result = await originalRedisGet(key, valueGetter, ttl);
			if (result !== null && result !== undefined) {
				redisCacheHits++;
			} else {
				cacheMisses++;
			}
			return result;
		};
		redisLevel.get = instrumentedRedisGet as any;

		const startTime = Date.now();
		const latencies: number[] = [];

		// Simulate 80/20 access pattern (80% requests to 20% of keys)
		for (let i = 0; i < totalCalls; i++) {
			const callStart = Date.now();
			
			let keyIndex: number;
			if (Math.random() < 0.8) {
				// 80% of requests go to hot keys (0-19)
				keyIndex = Math.floor(Math.random() * hotKeys);
			} else {
				// 20% of requests go to cold keys (20-99)
				keyIndex = hotKeys + Math.floor(Math.random() * (uniqueKeys - hotKeys));
			}

			const key = `benchmark_key_${keyIndex}`;
			await multiLevelCache.get(key);
			
			const callEnd = Date.now();
			latencies.push(callEnd - callStart);
		}

		const endTime = Date.now();
		const totalDuration = endTime - startTime;

		// Calculate statistics
		latencies.sort((a, b) => a - b);
		const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
		const p50 = latencies[Math.floor(latencies.length * 0.5)];
		const p95 = latencies[Math.floor(latencies.length * 0.95)];
		const p99 = latencies[Math.floor(latencies.length * 0.99)];
		const throughput = (totalCalls / totalDuration) * 1000;

		const result: BenchmarkResult = {
			description: "Multi-Level Cache with 80/20 Access Pattern",
			totalCalls,
			memoryCacheHits,
			redisCacheHits,
			cacheMisses,
			totalDuration,
			avgLatencyMs: avgLatency,
			p50LatencyMs: p50,
			p95LatencyMs: p95,
			p99LatencyMs: p99,
			throughputOps: throughput,
		};

		// Print results
		console.log("Results:");
		console.log(`  Total Calls: ${result.totalCalls}`);
		console.log(`  Memory Cache Hits: ${result.memoryCacheHits} (${((result.memoryCacheHits / result.totalCalls) * 100).toFixed(2)}%)`);
		console.log(`  Redis Cache Hits: ${result.redisCacheHits} (${((result.redisCacheHits / result.totalCalls) * 100).toFixed(2)}%)`);
		console.log(`  Cache Misses: ${result.cacheMisses} (${((result.cacheMisses / result.totalCalls) * 100).toFixed(2)}%)`);
		console.log(`\n  Performance Metrics:`);
		console.log(`    Total Duration: ${result.totalDuration}ms`);
		console.log(`    Average Latency: ${result.avgLatencyMs.toFixed(2)}ms`);
		console.log(`    P50 Latency: ${result.p50LatencyMs}ms`);
		console.log(`    P95 Latency: ${result.p95LatencyMs}ms`);
		console.log(`    P99 Latency: ${result.p99LatencyMs}ms`);
		console.log(`    Throughput: ${result.throughputOps.toFixed(2)} ops/sec`);
		console.log(`\n  Key Insights:`);
		console.log(`    - Memory cache prevented ${result.memoryCacheHits} Redis calls`);
		console.log(`    - That's ${((result.memoryCacheHits / result.totalCalls) * 100).toFixed(2)}% reduction in Redis load`);
		console.log(`    - Redis was hit ${result.redisCacheHits} times when memory cache missed\n`);

		// Cleanup
		await redisClient.quit();
	}, 120000);

	it("Benchmark 2: Speed Comparison - Multi-Level vs Redis-Only", async () => {
		console.log("\n========================================");
		console.log("BENCHMARK 2: SPEED COMPARISON");
		console.log("========================================\n");

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

		const totalCalls = 10000;
		const uniqueKeys = 100;

		// Pre-populate both caches
		for (let i = 0; i < uniqueKeys; i++) {
			const key = `speed_test_key_${i}`;
			const value = { id: i, data: `test_data_${i}_${"x".repeat(100)}` };
			await multiLevelCache.set(key, value);
			await redisOnlyCache.set(key, value);
		}

		await new Promise((resolve) => setTimeout(resolve, 100));

		// Benchmark Multi-Level Cache
		console.log("Testing Multi-Level Cache (Memory + Redis)...");
		const multiLevelLatencies: number[] = [];
		const multiLevelStart = Date.now();

		for (let i = 0; i < totalCalls; i++) {
			const keyIndex = Math.floor(Math.random() * uniqueKeys);
			const key = `speed_test_key_${keyIndex}`;
			
			const callStart = Date.now();
			await multiLevelCache.get(key);
			const callEnd = Date.now();
			multiLevelLatencies.push(callEnd - callStart);
		}

		const multiLevelEnd = Date.now();
		const multiLevelDuration = multiLevelEnd - multiLevelStart;

		// Benchmark Redis-Only Cache
		console.log("Testing Redis-Only Cache...");
		const redisOnlyLatencies: number[] = [];
		const redisOnlyStart = Date.now();

		for (let i = 0; i < totalCalls; i++) {
			const keyIndex = Math.floor(Math.random() * uniqueKeys);
			const key = `speed_test_key_${keyIndex}`;
			
			const callStart = Date.now();
			await redisOnlyCache.get(key);
			const callEnd = Date.now();
			redisOnlyLatencies.push(callEnd - callStart);
		}

		const redisOnlyEnd = Date.now();
		const redisOnlyDuration = redisOnlyEnd - redisOnlyStart;

		// Calculate statistics
		multiLevelLatencies.sort((a, b) => a - b);
		redisOnlyLatencies.sort((a, b) => a - b);

		const multiLevelResult: BenchmarkResult = {
			description: "Multi-Level Cache",
			totalCalls,
			totalDuration: multiLevelDuration,
			avgLatencyMs: multiLevelLatencies.reduce((a, b) => a + b, 0) / multiLevelLatencies.length,
			p50LatencyMs: multiLevelLatencies[Math.floor(multiLevelLatencies.length * 0.5)],
			p95LatencyMs: multiLevelLatencies[Math.floor(multiLevelLatencies.length * 0.95)],
			p99LatencyMs: multiLevelLatencies[Math.floor(multiLevelLatencies.length * 0.99)],
			throughputOps: (totalCalls / multiLevelDuration) * 1000,
		};

		const redisOnlyResult: BenchmarkResult = {
			description: "Redis-Only Cache",
			totalCalls,
			totalDuration: redisOnlyDuration,
			avgLatencyMs: redisOnlyLatencies.reduce((a, b) => a + b, 0) / redisOnlyLatencies.length,
			p50LatencyMs: redisOnlyLatencies[Math.floor(redisOnlyLatencies.length * 0.5)],
			p95LatencyMs: redisOnlyLatencies[Math.floor(redisOnlyLatencies.length * 0.95)],
			p99LatencyMs: redisOnlyLatencies[Math.floor(redisOnlyLatencies.length * 0.99)],
			throughputOps: (totalCalls / redisOnlyDuration) * 1000,
		};

		// Calculate improvements
		const speedImprovement = ((redisOnlyDuration - multiLevelDuration) / redisOnlyDuration) * 100;
		const latencyImprovement = ((redisOnlyResult.avgLatencyMs - multiLevelResult.avgLatencyMs) / redisOnlyResult.avgLatencyMs) * 100;
		const throughputImprovement = ((multiLevelResult.throughputOps - redisOnlyResult.throughputOps) / redisOnlyResult.throughputOps) * 100;

		// Print comparison
		console.log("\nMulti-Level Cache Results:");
		console.log(`  Total Duration: ${multiLevelResult.totalDuration}ms`);
		console.log(`  Avg Latency: ${multiLevelResult.avgLatencyMs.toFixed(2)}ms`);
		console.log(`  P50 Latency: ${multiLevelResult.p50LatencyMs}ms`);
		console.log(`  P95 Latency: ${multiLevelResult.p95LatencyMs}ms`);
		console.log(`  P99 Latency: ${multiLevelResult.p99LatencyMs}ms`);
		console.log(`  Throughput: ${multiLevelResult.throughputOps.toFixed(2)} ops/sec`);

		console.log("\nRedis-Only Cache Results:");
		console.log(`  Total Duration: ${redisOnlyResult.totalDuration}ms`);
		console.log(`  Avg Latency: ${redisOnlyResult.avgLatencyMs.toFixed(2)}ms`);
		console.log(`  P50 Latency: ${redisOnlyResult.p50LatencyMs}ms`);
		console.log(`  P95 Latency: ${redisOnlyResult.p95LatencyMs}ms`);
		console.log(`  P99 Latency: ${redisOnlyResult.p99LatencyMs}ms`);
		console.log(`  Throughput: ${redisOnlyResult.throughputOps.toFixed(2)} ops/sec`);

		console.log("\nPerformance Comparison:");
		console.log(`  Multi-Level is ${Math.abs(speedImprovement).toFixed(2)}% ${speedImprovement > 0 ? "FASTER" : "SLOWER"} overall`);
		console.log(`  Multi-Level has ${Math.abs(latencyImprovement).toFixed(2)}% ${latencyImprovement > 0 ? "LOWER" : "HIGHER"} average latency`);
		console.log(`  Multi-Level has ${Math.abs(throughputImprovement).toFixed(2)}% ${throughputImprovement > 0 ? "HIGHER" : "LOWER"} throughput\n`);

		// Cleanup
		await redisClient.quit();
		await redisOnlyClient.quit();
	}, 120000);

	it("Benchmark 3: Write Performance and Consistency", async () => {
		console.log("\n========================================");
		console.log("BENCHMARK 3: WRITE PERFORMANCE");
		console.log("========================================\n");

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

		const totalWrites = 1000;

		// Benchmark Multi-Level Cache Writes
		console.log("Testing Multi-Level Cache writes...");
		const multiLevelWriteStart = Date.now();
		const multiLevelWriteLatencies: number[] = [];

		for (let i = 0; i < totalWrites; i++) {
			const key = `write_test_key_${i}`;
			const value = { id: i, data: `write_data_${i}_${"x".repeat(100)}` };
			
			const callStart = Date.now();
			await multiLevelCache.set(key, value);
			const callEnd = Date.now();
			multiLevelWriteLatencies.push(callEnd - callStart);
		}

		const multiLevelWriteEnd = Date.now();
		const multiLevelWriteDuration = multiLevelWriteEnd - multiLevelWriteStart;

		// Benchmark Redis-Only Cache Writes
		console.log("Testing Redis-Only Cache writes...");
		const redisOnlyWriteStart = Date.now();
		const redisOnlyWriteLatencies: number[] = [];

		for (let i = 0; i < totalWrites; i++) {
			const key = `write_test_key_redis_${i}`;
			const value = { id: i, data: `write_data_${i}_${"x".repeat(100)}` };
			
			const callStart = Date.now();
			await redisOnlyCache.set(key, value);
			const callEnd = Date.now();
			redisOnlyWriteLatencies.push(callEnd - callStart);
		}

		const redisOnlyWriteEnd = Date.now();
		const redisOnlyWriteDuration = redisOnlyWriteEnd - redisOnlyWriteStart;

		// Calculate statistics
		multiLevelWriteLatencies.sort((a, b) => a - b);
		redisOnlyWriteLatencies.sort((a, b) => a - b);

		const multiLevelWriteAvg = multiLevelWriteLatencies.reduce((a, b) => a + b, 0) / multiLevelWriteLatencies.length;
		const redisOnlyWriteAvg = redisOnlyWriteLatencies.reduce((a, b) => a + b, 0) / redisOnlyWriteLatencies.length;

		const multiLevelWriteThroughput = (totalWrites / multiLevelWriteDuration) * 1000;
		const redisOnlyWriteThroughput = (totalWrites / redisOnlyWriteDuration) * 1000;

		console.log("\nMulti-Level Cache Write Performance:");
		console.log(`  Total Duration: ${multiLevelWriteDuration}ms`);
		console.log(`  Avg Write Latency: ${multiLevelWriteAvg.toFixed(2)}ms`);
		console.log(`  P50 Write Latency: ${multiLevelWriteLatencies[Math.floor(multiLevelWriteLatencies.length * 0.5)]}ms`);
		console.log(`  P95 Write Latency: ${multiLevelWriteLatencies[Math.floor(multiLevelWriteLatencies.length * 0.95)]}ms`);
		console.log(`  Write Throughput: ${multiLevelWriteThroughput.toFixed(2)} ops/sec`);

		console.log("\nRedis-Only Cache Write Performance:");
		console.log(`  Total Duration: ${redisOnlyWriteDuration}ms`);
		console.log(`  Avg Write Latency: ${redisOnlyWriteAvg.toFixed(2)}ms`);
		console.log(`  P50 Write Latency: ${redisOnlyWriteLatencies[Math.floor(redisOnlyWriteLatencies.length * 0.5)]}ms`);
		console.log(`  P95 Write Latency: ${redisOnlyWriteLatencies[Math.floor(redisOnlyWriteLatencies.length * 0.95)]}ms`);
		console.log(`  Write Throughput: ${redisOnlyWriteThroughput.toFixed(2)} ops/sec`);

		const writeDiff = ((multiLevelWriteDuration - redisOnlyWriteDuration) / redisOnlyWriteDuration) * 100;
		console.log("\nWrite Performance Comparison:");
		console.log(`  Multi-Level writes are ${Math.abs(writeDiff).toFixed(2)}% ${writeDiff > 0 ? "SLOWER" : "FASTER"} than Redis-only`);
		console.log(`  This is expected as writes must update both memory and Redis layers\n`);

		// Cleanup
		await redisClient.quit();
		await redisOnlyClient.quit();
	}, 120000);

	it("Benchmark 4: Memory Efficiency Analysis", async () => {
		console.log("\n========================================");
		console.log("BENCHMARK 4: MEMORY EFFICIENCY");
		console.log("========================================\n");

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
		const totalKeys = 1000;
		const valueSizeBytes = 1000; // ~1KB per value

		// Clear memory cache first
		if (typeof memoryLevel.purge === "function") {
			memoryLevel.purge();
		}

		console.log("Populating cache with test data...");
		for (let i = 0; i < totalKeys; i++) {
			const key = `memory_test_${i}`;
			const value = { id: i, data: "x".repeat(valueSizeBytes) };
			await multiLevelCache.set(key, value);
		}

		// Get memory usage info
		const heap = memoryLevel.getHeap();
		const itemCount = heap.getCount();
		const estimatedMemoryUsage = (itemCount * valueSizeBytes) / 1024 / 1024; // MB

		console.log("\nMemory Usage Statistics:");
		console.log(`  Items in Memory Cache: ${itemCount}`);
		console.log(`  Estimated Memory Usage: ~${estimatedMemoryUsage.toFixed(2)} MB`);
		console.log(`  Average Memory per Item: ~${(valueSizeBytes / 1024).toFixed(2)} KB`);
		console.log(`  Memory Efficiency: ${((itemCount / totalKeys) * 100).toFixed(2)}% of written items retained`);

		console.log("\nMemory Cache Benefits:");
		console.log(`  - Fast in-memory access for frequently accessed items`);
		console.log(`  - Automatic eviction based on configured strategies`);
		console.log(`  - Reduces network latency for cache hits`);
		console.log(`  - Offloads Redis for better resource utilization\n`);

		// Cleanup
		await redisClient.quit();
	}, 120000);
});
