/**
 * Utility functions for formatting and printing benchmark results
 */

import type { BenchmarkResult } from "./benchmark.utilities";

/**
 * Print cache hit rate analysis results
 */
export function printCacheHitRateResults(result: BenchmarkResult): void {
	console.log("Results:");
	console.log(`  Total Calls: ${result.totalCalls}`);
	console.log(
		`  Memory Cache Hits: ${result.memoryCacheHits} (${((result.memoryCacheHits! / result.totalCalls) * 100).toFixed(2)}%)`,
	);
	console.log(
		`  Redis Cache Hits: ${result.redisCacheHits} (${((result.redisCacheHits! / result.totalCalls) * 100).toFixed(2)}%)`,
	);
	console.log(
		`  Cache Misses: ${result.cacheMisses} (${((result.cacheMisses! / result.totalCalls) * 100).toFixed(2)}%)`,
	);
	console.log("\n  Performance Metrics:");
	console.log(`    Total Duration: ${result.totalDuration}ms`);
	console.log(`    Average Latency: ${result.avgLatencyMs.toFixed(2)}ms`);
	console.log(`    P50 Latency: ${result.p50LatencyMs}ms`);
	console.log(`    P95 Latency: ${result.p95LatencyMs}ms`);
	console.log(`    P99 Latency: ${result.p99LatencyMs}ms`);
	console.log(`    Throughput: ${result.throughputOps.toFixed(2)} ops/sec`);
	console.log("\n  Key Insights:");
	console.log(
		`    - Memory cache prevented ${result.memoryCacheHits} Redis calls`,
	);
	console.log(
		`    - That's ${((result.memoryCacheHits! / result.totalCalls) * 100).toFixed(2)}% reduction in Redis load`,
	);
	console.log(
		`    - Redis was hit ${result.redisCacheHits} times when memory cache missed\n`,
	);
}

/**
 * Print benchmark results for a single cache configuration
 */
export function printBenchmarkResults(
	title: string,
	result: BenchmarkResult,
): void {
	console.log(`\n${title}:`);
	console.log(`  Total Duration: ${result.totalDuration}ms`);
	console.log(`  Avg Latency: ${result.avgLatencyMs.toFixed(2)}ms`);
	console.log(`  P50 Latency: ${result.p50LatencyMs}ms`);
	console.log(`  P95 Latency: ${result.p95LatencyMs}ms`);
	console.log(`  P99 Latency: ${result.p99LatencyMs}ms`);
	console.log(`  Throughput: ${result.throughputOps.toFixed(2)} ops/sec`);
}

/**
 * Print performance comparison between two benchmark results
 */
export function printPerformanceComparison(
	baseline: BenchmarkResult,
	improved: BenchmarkResult,
): void {
	const speedImprovement =
		((baseline.totalDuration - improved.totalDuration) /
			baseline.totalDuration) *
		100;
	const latencyImprovement =
		((baseline.avgLatencyMs - improved.avgLatencyMs) / baseline.avgLatencyMs) *
		100;
	const throughputImprovement =
		((improved.throughputOps - baseline.throughputOps) /
			baseline.throughputOps) *
		100;

	console.log("\nPerformance Comparison:");
	console.log(
		`  ${improved.description} is ${Math.abs(speedImprovement).toFixed(2)}% ${speedImprovement > 0 ? "FASTER" : "SLOWER"} overall`,
	);
	console.log(
		`  ${improved.description} has ${Math.abs(latencyImprovement).toFixed(2)}% ${latencyImprovement > 0 ? "LOWER" : "HIGHER"} average latency`,
	);
	console.log(
		`  ${improved.description} has ${Math.abs(throughputImprovement).toFixed(2)}% ${throughputImprovement > 0 ? "HIGHER" : "LOWER"} throughput\n`,
	);
}

/**
 * Print write performance comparison
 */
export function printWritePerformanceComparison(
	multiLevel: BenchmarkResult,
	redisOnly: BenchmarkResult,
): void {
	const writeDiff =
		((multiLevel.totalDuration - redisOnly.totalDuration) /
			redisOnly.totalDuration) *
		100;

	console.log("\nWrite Performance Comparison:");
	console.log(
		`  Multi-Level writes are ${Math.abs(writeDiff).toFixed(2)}% ${writeDiff > 0 ? "SLOWER" : "FASTER"} than Redis-only`,
	);
	console.log(
		"  This is expected as writes must update both memory and Redis layers\n",
	);
}

/**
 * Print memory efficiency statistics
 */
export function printMemoryEfficiency(
	itemCount: number,
	totalItems: number,
	estimatedMemoryMB: number,
	avgMemoryPerItemKB: number,
): void {
	console.log("\nMemory Usage Statistics:");
	console.log(`  Items in Memory Cache: ${itemCount}`);
	console.log(`  Estimated Memory Usage: ~${estimatedMemoryMB.toFixed(2)} MB`);
	console.log(
		`  Average Memory per Item: ~${avgMemoryPerItemKB.toFixed(2)} KB`,
	);
	console.log(
		`  Memory Efficiency: ${((itemCount / totalItems) * 100).toFixed(2)}% of written items retained`,
	);

	console.log("\nMemory Cache Benefits:");
	console.log("  - Fast in-memory access for frequently accessed items");
	console.log("  - Automatic eviction based on configured strategies");
	console.log("  - Reduces network latency for cache hits");
	console.log("  - Offloads Redis for better resource utilization\n");
}

/**
 * Print benchmark section header
 */
export function printBenchmarkHeader(title: string): void {
	console.log("\n========================================");
	console.log(title);
	console.log("========================================\n");
}
