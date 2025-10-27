export interface Versioning {
    getVersionedKey(key: string, namespace?: string): Promise<string>;
    getCurrentVersion(key: string): Promise<number>;
    invalidate(key: string): Promise<void>;
}
//# sourceMappingURL=versioning.d.ts.map