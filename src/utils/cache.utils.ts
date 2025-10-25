export function parseIfJSON<T>(value: T): T {
    try {
        return JSON.parse(value as unknown as string) as T;
    } catch {
        return value as unknown as T;
    }
}