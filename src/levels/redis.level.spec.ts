
import { RedisContainer } from "@testcontainers/redis";
import { RedisCacheLevel } from './redis.level';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import { Redis } from 'ioredis';
import { faker, fakerZH_TW } from "@faker-js/faker";

let redisContainer: any;
let redisCache: RedisCacheLevel;
let client: Redis;

describe('RedisCacheLevel (single node)', () => {
  beforeAll(async () => {
    redisContainer = await new RedisContainer('redis:7.2').start();
    client = new Redis(redisContainer.getConnectionUrl());
    redisCache = new RedisCacheLevel(client);
  });

  it('connection should be established', async () => {
    await client.set("key", "val");
    expect(await client.get("key")).toBe("val");
  });

 it('should store & retrieve strings', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.string.alpha(10);

    await redisCache.set(testKey, testValue);
    const retrievedValue = await redisCache.get(testKey);

    expect(retrievedValue).toEqual(testValue);
 });

  it('should store & retrieve integers', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.number.int();

    await redisCache.set(testKey, testValue);
    const retrievedValue = await redisCache.get(testKey);

    expect(retrievedValue).toEqual(testValue);
  });

  it('should allow integer keys', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.string.alpha(10);

    await redisCache.set(testKey, testValue);
    const retrievedValue = await redisCache.get(testKey);

    expect(retrievedValue).toEqual(testValue);
  });

  it('should allow object based structures', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.helpers.objectValue({
      name: faker.person.firstName(),
      age: faker.number.int({ min: 1, max: 100 }),
      address: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        zip: faker.location.zipCode(),
      },
      hobbies: faker.helpers.arrayElements(
        ['reading', 'gaming', 'hiking', 'coding', 'cooking'],
        3
      ),
    });

    await redisCache.set(testKey, testValue);
    const retrievedValue = await redisCache.get(testKey);

    expect(retrievedValue).toEqual(testValue);
  });

  it('should allow array based structures', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.helpers.arrayElements(
      [faker.number.int(), faker.helpers.objectValue({
        type: 'date',
        color: 'brown'
      }), faker.string.alpha(5)],
      3
    );

    await redisCache.set(testKey, testValue);
    const retrievedValue = await redisCache.get(testKey);

    expect(retrievedValue).toEqual(testValue);
  });

  it('should store & retrieve international characters', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = fakerZH_TW.lorem.words(5);

    await redisCache.set(testKey, testValue);
    const retrievedValue = await redisCache.get(testKey);

    expect(retrievedValue).toEqual(testValue);
  });

  it('should handle TTL expiration correctly', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.string.alpha(10);
    const ttl = 2;
    
    await redisCache.set(testKey, testValue, ttl);
    const retrievedValueBeforeExpiry = await redisCache.get(testKey);
    expect(retrievedValueBeforeExpiry).toEqual(testValue);
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const retrievedValueAfterExpiry = await redisCache.get(testKey);
    expect(retrievedValueAfterExpiry).toBeUndefined();
  });

  it('should lock and unlock keys correctly', async () => {
    const testKey = faker.string.alpha(10);
    let lockAcquired = false;

    const result = await redisCache.lock<number>(testKey, async () => {
      lockAcquired = true;
      return 42;
    }, 5);

    expect(lockAcquired).toBe(true);
    expect(result).toBe(42);
  });

  it('should execute closure to get value if key is missing', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.number.int();
    
    const retrievedValue = await redisCache.get<number>(testKey, async () => {
      return testValue;
    });

    expect(retrievedValue).toBe(testValue);
    
    const cachedValue = await redisCache.get<number>(testKey);
    expect(cachedValue).toBe(testValue);
  });

  it('should handle key deletion correctly', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.string.alpha(10);
    
    await redisCache.set(testKey, testValue);
    const retrievedValue = await redisCache.get(testKey);
    expect(retrievedValue).toEqual(testValue);
    
    await redisCache.del(testKey);
    const valueAfterDeletion = await redisCache.get(testKey);
    expect(valueAfterDeletion).toBeUndefined();
  });

  it('should execute closure to get value if key is missing', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.number.int();
    
    const retrievedValue = await redisCache.get<number>(testKey, async () => {
      return testValue;
    });

    expect(retrievedValue).toBe(testValue);
    
    const cachedValue = await redisCache.get<number>(testKey);
    expect(cachedValue).toBe(testValue);
  });

  afterAll(async () => {
    await client.disconnect();
    await redisContainer.stop();
  });
});