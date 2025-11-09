import { JSONParse, JSONStringify } from "json-with-bigint";

/**
 * Serializes any JS value (including BigInt, Date, etc.) for Redis storage.
 * @param item The value to serialize
 * @returns A string safe for Redis storage
 */
export const serialize = (item: unknown) => {
	return JSONStringify(item);
};

/**
 * Deserializes a value from Redis (previously stored with serialize).
 * @param str The string from Redis
 * @returns The original JS value
 */
export const deserialize = (str: never) => {
	return JSONParse(str);
};
