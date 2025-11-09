import { faker } from "@faker-js/faker";
import type { CacheLevel } from "../../src/levels/interfaces/cache-level";

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
