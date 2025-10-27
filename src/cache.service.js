"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
const constants_1 = require("./constants");
const version_manager_1 = require("./features/version-manager");
class CacheService {
    levels;
    defaultTTL;
    defaultLockTTL;
    versioning;
    constructor(options) {
        this.levels = options.levels;
        this.defaultTTL = options.defaultTTL ?? constants_1.DEFAULT_TTL;
        this.defaultLockTTL = options.defaultLockTTL ?? constants_1.DEFAULT_LOCK_TTL;
        this.versioning = options.versioning ?? false;
    }
    /**
     * Loop through cache levels to get the value for the given key
     * @param key - cache key
     * @returns cached value or null if not found
     * @param valueGetter - function to get the value if not present in cache
     * @param ttl - time to live in seconds
     * @param namespace - used to group related cache entries for easier invalidation
     */
    async get(key, valueGetter, ttl, namespace) {
        if (this.versioning) {
            const firstLevel = this.levels[0];
            if (!firstLevel) {
                throw new Error("set: Failed to find first cache level");
            }
            const versionedLevel = new version_manager_1.VersionManager(firstLevel);
            const currentVersion = await versionedLevel.getCurrentVersion(namespace ?? key);
            for (const level of this.levels) {
                try {
                    const currentVersionedLevel = new version_manager_1.VersionManager(level);
                    return await currentVersionedLevel.getWithVersion(key, currentVersion, valueGetter, ttl, namespace);
                }
                catch (e) {
                    console.warn("Failed to getWithVersion, gracefully continuing with next level.", e);
                }
            }
            return null;
        }
        for (const level of this.levels) {
            try {
                const value = await level.get(key, valueGetter, ttl);
                if (value !== undefined && value !== null) {
                    return value;
                }
            }
            catch (e) {
                console.warn("Failed to get, gracefully continuing with next level.", e);
            }
        }
        return null;
    }
    /**
     * Set the value for the given key in all cache levels
     * @param key - cache key
     * @param value - value to cache
     * @param ttl - time to live in seconds
     */
    async set(key, value, ttl = this.defaultTTL, namespace) {
        if (this.versioning) {
            const firstLevel = this.levels[0];
            if (!firstLevel) {
                throw new Error("set: Failed to find first cache level");
            }
            const versionedLevel = new version_manager_1.VersionManager(firstLevel);
            const currentVersion = await versionedLevel.getCurrentVersion(namespace ?? key);
            await Promise.allSettled(this.levels.map((level) => {
                try {
                    const currentLevel = new version_manager_1.VersionManager(level);
                    return currentLevel.setWithVersion(key, value, currentVersion, ttl);
                }
                catch (e) {
                    // Gracefully catch set errors, so we can move to next level
                    console.warn("Failed to setWithVersion, gracefully continuing with next level.", e);
                    return Promise.reject(e);
                }
            }));
            return;
        }
        await Promise.allSettled(this.levels.map((level) => {
            try {
                return level.set(key, value, ttl);
            }
            catch (e) {
                // Gracefully catch set errors, so we can move to next level
                console.warn("Failed to set, gracefully continuing with next level.", e);
                return Promise.reject(e);
            }
        }));
    }
    /**
     * Delete the value for the given key from all cache levels
     * @param key - key to delete
     */
    async del(key, namespace) {
        await Promise.allSettled(this.levels.map((level) => {
            try {
                if (this.versioning) {
                    const versionedLevel = new version_manager_1.VersionManager(level);
                    return versionedLevel.del(key, namespace);
                }
                return level.del(key);
            }
            catch (e) {
                console.warn("Failed to delete key, gracefully continuing with next level.", e);
                return Promise.reject(e);
            }
        }));
        return;
    }
    /**
     * Invalidates given key via increment
     * @param key - key to invalidate
     * @throws Error - if invalidation fails, not handled intentionally.
     */
    async invalidateKey(key) {
        const promises = [];
        if (this.versioning) {
            for (const level of this.levels) {
                const versionedLevel = new version_manager_1.VersionManager(level);
                promises.push(versionedLevel.invalidate(key));
            }
        }
        await Promise.allSettled(promises);
    }
    /**
     * Acquire a lock for the given key and execute the callback function once the lock is acquired
     * Prevent multiple processes from executing the same code simultaneously.
     * Retrieve the first cache level that supports locking and use it to acquire the lock.
     * @param key - cache key
     * @param callback - function to execute while holding the lock
     * @param ttl - time to live for the lock
     * @returns result of the callback function
     */
    async lock(key, callback, ttl = this.defaultLockTTL) {
        const lockLevels = this.levels.filter((l) => "lock" in l);
        for (const level of lockLevels) {
            return level.lock(key, callback, ttl);
        }
        throw new Error("Locking not supported in the current cache levels.");
    }
}
exports.CacheService = CacheService;
//# sourceMappingURL=cache.service.js.map