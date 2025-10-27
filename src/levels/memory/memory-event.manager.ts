import { EventEmitter } from "events";

export class MemoryEventManager {
    private static emitter = new EventEmitter();

    static subscribe(event: string, listener: () => void): void {
        this.emitter.on(event, listener);
    }

    static emit(event: string): void {
        this.emitter.emit(event);
    }

    static onMemoryChange(listener: () => void): void {
        this.subscribe("memoryChange", listener);
    }

    static triggerMemoryChange(): void {
        this.emit("memoryChange");
    }
}