import { CacheLevel } from "../levels/interfaces/cache-level";
import { generateVersionLookupKey } from "../utils/version.utils";

const SEVEN_DAYS_IN_SECONDS = 3600 * 24 * 7;

export class VersionManager {
    constructor(private level: CacheLevel) { }

    async getCurrentVersion(key: string): Promise<number> {
        const versionKey = generateVersionLookupKey(key);
        const value = await this.level.get<number>(versionKey, 1, SEVEN_DAYS_IN_SECONDS);
        return Number(value);
    }

    async getOrSetVersionedKeyLookup(key: string, namespace?: string): Promise<string> {
        const currentVersion = await this.getCurrentVersion(namespace ?? key);
        const lookupKey = `${namespace ?? key}:v${currentVersion}`;
        return lookupKey;
    }

    async invalidate(key: string): Promise<number> {
        const versionKey = generateVersionLookupKey(key);
        const current = await this.getCurrentVersion(key);
        const newVersion = current + 1;
        await this.level.set(versionKey, newVersion, SEVEN_DAYS_IN_SECONDS);
        return newVersion;
    }

    async get<T>(key: string, value?: (() => Promise<T>) | T, ttl?: number, namespace?: string): Promise<T | null> {
        const versionedKey = await this.getOrSetVersionedKeyLookup(key, namespace);
        return this.level.get<T>(versionedKey, value, ttl);
    }

    async set<T>(key: string, value: T, ttl?: number, namespace?: string): Promise<T | null> {
        const versionedKey = await this.getOrSetVersionedKeyLookup(key, namespace);
        return this.level.set<T>(versionedKey, value, ttl);
    }

    async del(key: string): Promise<void> {
        const versionedKey = await this.getOrSetVersionedKeyLookup(key);
        await this.level.del(versionedKey);
    }
}