import { VersionManager } from "../features/version-manager";
import type { CacheLevel } from "../levels/interfaces";
import { handleGracefully } from "./error.utils";

export async function backfillVersionedLevels(
	failedLevels: CacheLevel[],
	key: string,
	value: unknown,
	version: number,
	ttl?: number,
): Promise<void> {
	if (failedLevels.length === 0) return;
	await Promise.allSettled(
		failedLevels.map((failedLevel) => {
			return handleGracefully(
				() => {
					const failedVersionedLevel = new VersionManager(failedLevel);
					return failedVersionedLevel.setWithVersion(key, value, version, ttl);
				},
				"Failed to backfill setWithVersion, gracefully continuing with next level.",
				false,
			);
		}),
	);
}

export async function backfillLevelsWithMultiKeys(
	failedLevels: CacheLevel[],
	keys: string[],
	values: unknown[],
	ttl?: number,
): Promise<void> {
	if (failedLevels.length === 0) return;
	await Promise.allSettled(
		failedLevels.map((failedLevel) => {
			return handleGracefully(
				() => {
					return failedLevel.mset(keys, values, ttl);
				},
				"Failed to backfill mset, gracefully continuing with next level.",
				false,
			);
		}),
	);
}

export async function backfillLevels(
	failedLevels: CacheLevel[],
	key: string,
	value: unknown,
	ttl?: number,
): Promise<void> {
	console.log("backfillLevels called with key:", key);
	if (failedLevels.length === 0) return;
	await Promise.allSettled(
		failedLevels.map((failedLevel) => {
			return handleGracefully(
				() => {
					return failedLevel.set(key, value, ttl);
				},
				"Failed to backfill set, gracefully continuing with next level.",
				false,
			);
		}),
	);
}
