import IoRedis, { Cluster } from 'ioredis';
import { CacheLevel } from './interfaces/cache-level';
import { Lockable } from './interfaces/lockable';
import { Redlock } from "@sesamecare-oss/redlock";
import { DEFAULT_TTL } from '../constants';
import { parseIfJSON } from '../utils/cache.utils';
import { generateVersionLookupKey } from '../utils/version.utils';

export class RedisCacheLevel implements CacheLevel, Lockable {
  private client: IoRedis | Cluster;

  constructor(client: IoRedis | Cluster) {
    this.client = client;
  }

  /**
   *
   * @param key - cache key
   * @param valueGetter - function to get the value if not present in cache
   * @param ttl - time to live in seconds
   * @param namespace - used to group related cache entries for easier invalidation
   * @returns
   */
  async get<T>(
    key: string,
    value?: (() => Promise<T>) | T,
    ttl?: number
  ): Promise<T> {
    const cachedValue = await this.client.get(key) as T;

    if (cachedValue === null || cachedValue === undefined) {
      let newValue: unknown;

      if (value instanceof Function) {
        newValue = await value();
      } else {
        newValue = value;
      }

      await this.set(key, newValue, ttl);
      return newValue as T;
    }

    return parseIfJSON<T>(cachedValue);
  }

  async set<T>(key: string, value: T, ttl = DEFAULT_TTL) {
    await this.client.set(
      key,
      JSON.stringify(value),
      'EX',
      ttl
    );
    
    return parseIfJSON(value) as T;
  }

  async del(key: string) {
    // delete versioned key
    await this.client.del(key);

    // delete version lookup key
    const versionKey = generateVersionLookupKey(key);
    await this.client.del(versionKey);
  }

  async lock<T>(key: string, callback: () => Promise<T>, ttl = 30): Promise<T> {
    const redlockClient = new Redlock([this.client], {
      driftFactor: 0.01,
      retryCount: 10,
      retryDelay: 200, 
      retryJitter: 200,
      automaticExtensionThreshold: 500,
    });

    const lock = await redlockClient.acquire([`lock:${key}`], ttl * 1000);
    try {
      const result = await callback();
      return result;
    } finally {
      await lock.release();
    }
  }
}
