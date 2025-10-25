import { afterEach, describe, expect, it } from 'vitest';
import { MemoryCacheLevel } from '.';
import { faker, fakerZH_TW } from '@faker-js/faker';
import { generateJSONData } from '../../tests/utilities/data.utilities';
import { MemoryPercentageLimitStrategy } from '../strategies/memory-percentage-limit.strategy';
import { FirstExpiringMemoryPolicy } from '../policies';

const evictionPolicy = new FirstExpiringMemoryPolicy();
const strategy = new MemoryPercentageLimitStrategy(80, evictionPolicy);
const cacheEngine = new MemoryCacheLevel(strategy);

describe('should successfully store data, and retrieve it on demand', async () => {
  afterEach(() => {
    cacheEngine.purge();
  });

  it('should store & retrieve strings', async () => {
        const testKey = faker.string.alpha(10);
        const testValue = faker.string.alpha(10);

        await cacheEngine.set(testKey, testValue);
        const retrievedValue = await cacheEngine.get(testKey);

        expect(retrievedValue).toEqual(testValue);
    });

  it('should store & retrieve integers', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.number.int();

    await cacheEngine.set(testKey, testValue);
    const retrievedValue = await cacheEngine.get(testKey);

    expect(retrievedValue).toEqual(testValue);
  });

  it('should allow integer keys', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.string.alpha(10);

    await cacheEngine.set(testKey, testValue);
    const retrievedValue = await cacheEngine.get(testKey);

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

    await cacheEngine.set(testKey, testValue);
    const retrievedValue = await cacheEngine.get(testKey);

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

    await cacheEngine.set(testKey, testValue);
    const retrievedValue = await cacheEngine.get(testKey);

    expect(retrievedValue).toEqual(testValue);
  });

  it('should store & retrieve international characters', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = fakerZH_TW.lorem.words(5);

    await cacheEngine.set(testKey, testValue);
    const retrievedValue = await cacheEngine.get(testKey);

    expect(retrievedValue).toEqual(testValue);
  });
});

describe('It should successfully manage the application memory usage', () => {
  it('should return a number representing memory usage', () => {
    const memoryUsage = cacheEngine.getMemoryUsage();
    expect(typeof memoryUsage).toBe('number');
    expect(memoryUsage).toBeGreaterThan(0);
  });

  it('should have reasonable execution time for insertions', async () => {
    const start = Date.now();
    const end = Date.now();
    const executionTime = end - start;

    expect(executionTime).toBeLessThan(5);

    const INSERT_AMOUNT = 10000;
    // Initial insertions
    await generateJSONData(cacheEngine, INSERT_AMOUNT)

    const startLarge = Date.now();
    const endLarge = Date.now();
    const executionTimeLarge = endLarge - startLarge;

    // each insertion should take less than 1 microsecond on average
    expect(executionTimeLarge / INSERT_AMOUNT).toBeLessThan(1);
  });

  it('should run get operations with fallback async function if cache miss occurs', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.string.alpha(20);
    const fallbackFunction = async () => {
      return testValue;
    }
    const retrievedValue = await cacheEngine.get<string>(testKey, fallbackFunction);
    
    expect(retrievedValue).toEqual(testValue);
  });

  it('should run get operations with fallback direct value if cache miss occurs', async () => {
    const testKey = faker.string.alpha(10);
    const testValue = faker.string.alpha(20);
    
    const retrievedValue = await cacheEngine.get<string>(testKey, testValue);
    
    expect(retrievedValue).toEqual(testValue);
  });

  it('should return undefined if no fallback provided and cache miss occurs', async () => {
    const testKey = faker.string.alpha(10);
    
    const retrievedValue = await cacheEngine.get<string>(testKey);
    
    expect(retrievedValue).toBeUndefined();
  });
});