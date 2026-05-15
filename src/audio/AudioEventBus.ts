import type { AudioEventHandler, AudioEventName, AudioEventPayload } from './types';

export class AudioEventBus {
  private readonly listeners = new Map<AudioEventName, Set<AudioEventHandler>>();

  on(event: AudioEventName, handler: AudioEventHandler): () => void {
    const handlers = this.listeners.get(event) ?? new Set<AudioEventHandler>();
    handlers.add(handler);
    this.listeners.set(event, handlers);
    return () => handlers.delete(handler);
  }

  emit(event: AudioEventName, payload: AudioEventPayload): void {
    const handlers = this.listeners.get(event);
    if (!handlers) return;
    handlers.forEach((handler) => handler(payload));
  }
}
