import { afterEach, describe, expect, it } from 'vitest';
import { MemoryCacheLevel } from '../levels';
import { FirstExpiringMemoryPolicy } from './first-expiring-memory.policy';
import { generateJSONData } from '../../tests/utilities/data.utilities';
import { MemoryPercentageLimitStrategy } from '../strategies/memory-percentage-limit.strategy';

const policy = new FirstExpiringMemoryPolicy();
const strategy = new MemoryPercentageLimitStrategy(80, policy);
const cacheEngine = new MemoryCacheLevel(strategy);

describe('First Expiring Memory Policy', () => {
    afterEach(() => {
        cacheEngine.purge();
    });
    it('should evict x amount of items from memory', async () => {
        await generateJSONData(cacheEngine, 1000)

        expect(cacheEngine.getHeap().getCount()).toEqual(1000);

        const policy = new FirstExpiringMemoryPolicy();
        await policy.evict(cacheEngine);

        expect(cacheEngine.getHeap().getCount()).toEqual(1000 - 0.1 * 1000);
    });

    it('should evict way too much to see how system handles it', async () => {
        await generateJSONData(cacheEngine, 1000);

        expect(cacheEngine.getHeap().getCount()).toEqual(1000);

        const policy = new FirstExpiringMemoryPolicy();
        
        for (let i = 0; i <= 10000; i++) {
            await policy.evict(cacheEngine);
        }

        expect(cacheEngine.getHeap().getCount()).toEqual(0);
    })
})