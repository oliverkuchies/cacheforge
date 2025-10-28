import { EventEmitter } from "node:events";

const emitter = new EventEmitter();

export function subscribe(event: string, listener: () => void): void {
	emitter.on(event, listener);
}

export function emit(event: string): void {
	emitter.emit(event);
}

export function onMemoryChange(listener: () => void): void {
	subscribe("memoryChange", listener);
}

export function triggerMemoryChange(): void {
	emit("memoryChange");
}
