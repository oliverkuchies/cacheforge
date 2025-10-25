import { MinHeap } from "@datastructures-js/heap";

export interface MemoryHeap<T> extends MinHeap<T> {
    rebuild: (items: T[]) => void;
    getSnapshot: () => T[];
    getCount: () => number;
}

export const createCacheHeap = <T>(comparator: (a: T) => number) => {
  let itemCounter = 0;
  const heap = new MinHeap<T>(comparator) as MemoryHeap<T>;

  heap.rebuild = (items: T[]) => {
    heap.clear();
    items.forEach(item => heap.insert(item));
    itemCounter = 0;
  };

  const originalPop = heap.pop.bind(heap);
  heap.pop = () => {
    itemCounter -=1;
    return originalPop();
  }

  const originalInsert = heap.insert.bind(heap);
  heap.insert = (item: T) => {
    itemCounter++;
    return originalInsert(item);
  };

  const originalClear = heap.clear.bind(heap);
  heap.clear = () => {
    itemCounter = 0;
    return originalClear();
  }

  heap.getSnapshot = () => Array.from(heap);
  heap.getCount = () => itemCounter;

  return heap;
};