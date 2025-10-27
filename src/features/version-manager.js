"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionManager = void 0;
const version_utils_1 = require("../utils/version.utils");
const SEVEN_DAYS_IN_SECONDS = 3600 * 24 * 7;
class VersionManager {
    level;
    constructor(level) {
        this.level = level;
    }
    /**
     * @description Get the current version for a given key
     * @param key
     * @returns {Promise<number>} current version
     */
    async getCurrentVersion(key) {
        try {
            const versionKey = (0, version_utils_1.generateVersionLookupKey)(key);
            const value = await this.level.get(versionKey, 1, SEVEN_DAYS_IN_SECONDS);
            return Number(value);
        }
        catch (e) {
            console.error("Failed to get version. Falling back to 1. Exception: ", e);
            return 1;
        }
    }
    buildLookupKey(key, version) {
        if (Number.isNaN(version)) {
            version = 1;
        }
        return `${key}:${version}`;
    }
    /**
     * @description Get the versioned key lookup for a given key
     * @param key
     * @param namespace
     * @returns {Promise<string>} versioned key
     */
    async getOrSetVersionedKeyLookup(key, namespace) {
        const currentVersion = await this.getCurrentVersion(namespace ?? key);
        return this.buildLookupKey(key, currentVersion);
    }
    /**
     * @description Invalidate the current version for a given key
     * @param key
     * @returns {Promise<number>} new version
     */
    async invalidate(key) {
        const versionKey = (0, version_utils_1.generateVersionLookupKey)(key);
        const current = await this.getCurrentVersion(key);
        const newVersion = current + 1;
        await this.level.set(versionKey, newVersion, SEVEN_DAYS_IN_SECONDS);
        return newVersion;
    }
    /**
     * Get with version to prevent extra lookup latency
     */
    async getWithVersion(key, version, value, ttl, namespace) {
        const versionedKey = this.buildLookupKey(key, version);
        return this.level.get(versionedKey, value, ttl, namespace);
    }
    /**
     * Set with version to prevent extra lookup latency
     * @param key
     * @param value
     * @param version
     * @param ttl
     */
    async setWithVersion(key, value, version = 1, ttl) {
        const versionedKey = this.buildLookupKey(key, version);
        return await this.level.set(versionedKey, value, ttl);
    }
    /**
     * @description Get the value for a given key
     * @param key - cache key
     * @param value - optional value or function to get the value
     * @param ttl - optional time to live
     * @param namespace - optional namespace for versioning
     * @returns {Promise<T | null>} value
     */
    async get(key, value, ttl, namespace) {
        const versionedKey = await this.getOrSetVersionedKeyLookup(key, namespace);
        return this.level.get(versionedKey, value, ttl);
    }
    async set(key, value, ttl, namespace) {
        const versionedKey = await this.getOrSetVersionedKeyLookup(key, namespace);
        await this.level.set(versionedKey, value, ttl);
        const version = this.retrieveVersionFromKey(versionedKey);
        return version;
    }
    async del(key, namespace) {
        const versionedKey = await this.getOrSetVersionedKeyLookup(key, namespace);
        await this.level.del(versionedKey);
        const version = this.retrieveVersionFromKey(versionedKey);
        return version;
    }
    retrieveVersionFromKey(versionedKey) {
        const splitKey = versionedKey.split(":");
        const version = splitKey[splitKey.length - 1];
        return version;
    }
}
exports.VersionManager = VersionManager;
//# sourceMappingURL=version-manager.js.map