/**
 * Utility functions for cache benchmarking
 */

import type { MemoryCacheLevel } from "../../src/levels";
import type { RedisCacheLevel } from "../../src/levels/redis/redis.level";

export interface BenchmarkResult {
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

export interface LatencyStats {
	avgLatencyMs: number;
	p50LatencyMs: number;
	p95LatencyMs: number;
	p99LatencyMs: number;
}

/**
 * Calculate latency statistics from an array of latency measurements
 */
export function calculateLatencyStats(latencies: number[]): LatencyStats {
	const sortedLatencies = [...latencies].sort((a, b) => a - b);
	const avgLatency =
		sortedLatencies.reduce((a, b) => a + b, 0) / sortedLatencies.length;
	const p50 = sortedLatencies[Math.floor(sortedLatencies.length * 0.5)];
	const p95 = sortedLatencies[Math.floor(sortedLatencies.length * 0.95)];
	const p99 = sortedLatencies[Math.floor(sortedLatencies.length * 0.99)];

	return {
		avgLatencyMs: avgLatency,
		p50LatencyMs: p50,
		p95LatencyMs: p95,
		p99LatencyMs: p99,
	};
}

/**
 * Calculate throughput in operations per second
 */
export function calculateThroughput(
	totalCalls: number,
	totalDurationMs: number,
): number {
	return (totalCalls / totalDurationMs) * 1000;
}

/**
 * Calculate percentage improvement between two values
 */
export function calculateImprovement(baseline: number, improved: number): number {
	return ((baseline - improved) / baseline) * 100;
}

/**
 * Instrument a memory cache level to track hits
 */
export function instrumentMemoryCache(
	memoryLevel: MemoryCacheLevel,
	hitCounter: { count: number },
): void {
	const originalGet = memoryLevel.get.bind(memoryLevel);
	const instrumentedGet = async function <T>(
		key: string,
		valueGetter?: (() => Promise<T>) | T,
		ttl?: number,
	): Promise<T | null> {
		const result = await originalGet(key);
		if (result !== null && result !== undefined) {
			hitCounter.count++;
		}
		return result as T;
	};
	memoryLevel.get = instrumentedGet as any;
}

/**
 * Instrument a Redis cache level to track hits and misses
 */
export function instrumentRedisCache(
	redisLevel: RedisCacheLevel,
	hitCounter: { count: number },
	missCounter: { count: number },
): void {
	const originalGet = redisLevel.get.bind(redisLevel);
	const instrumentedGet = async function <T>(
		key: string,
		valueGetter?: (() => Promise<T>) | T,
		ttl?: number,
	): Promise<T | null> {
		const result = await originalGet(key);
		if (result !== null && result !== undefined) {
			hitCounter.count++;
		} else {
			missCounter.count++;
		}
		return result as T;
	};
	redisLevel.get = instrumentedGet as any;
}

/**
 * Generate a random key index following an 80/20 access pattern
 * 80% of requests go to 20% of the keys (hot keys)
 */
export function get8020KeyIndex(totalKeys: number, hotKeyRatio = 0.2): number {
	const hotKeys = Math.floor(totalKeys * hotKeyRatio);
	if (Math.random() < 0.8) {
		// 80% of requests go to hot keys
		return Math.floor(Math.random() * hotKeys);
	}
	// 20% of requests go to cold keys
	return hotKeys + Math.floor(Math.random() * (totalKeys - hotKeys));
}

/**
 * Generate a random key index with uniform distribution
 */
export function getUniformKeyIndex(totalKeys: number): number {
	return Math.floor(Math.random() * totalKeys);
}

/**
 * Populate cache with test data
 */
export async function populateCache<T extends { set: (key: string, value: any, ttl?: number) => Promise<any> }>(
	cache: T,
	keyPrefix: string,
	count: number,
	valueSize = 100,
): Promise<void> {
	for (let i = 0; i < count; i++) {
		const key = `${keyPrefix}_${i}`;
		const value = { id: i, data: `test_data_${i}_${"x".repeat(valueSize)}` };
		await cache.set(key, value);
	}
}

/**
 * Run a benchmark with latency tracking
 */
export async function runBenchmark(
	operationFn: () => Promise<void>,
	iterations: number,
): Promise<{ latencies: number[]; totalDuration: number }> {
	const latencies: number[] = [];
	const startTime = Date.now();

	for (let i = 0; i < iterations; i++) {
		const callStart = Date.now();
		await operationFn();
		const callEnd = Date.now();
		latencies.push(callEnd - callStart);
	}

	const endTime = Date.now();
	const totalDuration = endTime - startTime;

	return { latencies, totalDuration };
}
