import { faker } from "@faker-js/faker";
import type { CacheLevel } from "../../src/levels/interfaces/cache-level";

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

export async function generateJSONData(
	cacheLevel: CacheLevel,
	recordNum: number,
) {
	for (let i = 0; i < recordNum; i++) {
		const ttl = Date.now() + 3600
		await cacheLevel.set(
			`key${i}`,
			{
				name: faker.person.firstName(),
				age: faker.number.int({ min: 1, max: 100 }),
				address: {
					street: faker.location.streetAddress(),
					city: faker.location.city(),
					zip: faker.location.zipCode(),
				},
				hobbies: faker.helpers.arrayElements(
					["reading", "gaming", "hiking", "coding", "cooking"],
					3,
				),
			},
			ttl,
		);
	}
}
