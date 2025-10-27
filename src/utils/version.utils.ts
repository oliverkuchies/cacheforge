export function generateVersionLookupKey(key: string): `${string}:version` {
	return `${key}:version` as const;
}
