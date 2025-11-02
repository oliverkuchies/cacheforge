import { faker } from "@faker-js/faker";
import { describe, expect, it } from "vitest";
import { deserializeFromRedis } from "./parsing.utils";

describe("deserialise from redis", () => {
	it("should handle standard objects, even if not parsed with superjson", () => {
		const object = {
			hello: faker.string.alpha(),
			world: faker.string.numeric(),
		};

		const parsed = JSON.stringify(object);

		expect(deserializeFromRedis(parsed as never)).toEqual(object);
	});
});
