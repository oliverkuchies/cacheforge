import { EventEmitter } from "events";

export class MemoryEventManager {
	private static emitter = new EventEmitter();

	static subscribe(event: string, listener: () => void): void {
		MemoryEventManager.emitter.on(event, listener);
	}

	static emit(event: string): void {
		MemoryEventManager.emitter.emit(event);
	}

	static onMemoryChange(listener: () => void): void {
		MemoryEventManager.subscribe("memoryChange", listener);
	}

	static triggerMemoryChange(): void {
		MemoryEventManager.emit("memoryChange");
	}
}
