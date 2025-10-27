import { MinHeap } from "@datastructures-js/heap";
export interface MemoryHeap<T> extends MinHeap<T> {
    rebuild: (items: T[]) => void;
    getSnapshot: () => T[];
    getCount: () => number;
}
export declare const createCacheHeap: <T>(comparator: (a: T) => number) => MemoryHeap<T>;
//# sourceMappingURL=heap.utils.d.ts.map