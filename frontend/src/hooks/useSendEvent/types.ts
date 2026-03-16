/**
 * Event severities supported by the global event bus.
 */
export type EventType = 'error' | 'info' | 'success' | 'warning';

/**
 * Payload published through the application event bus.
 */
export interface GlobalEvent {
  title: string;
  description: string;
  eventType: EventType;
  timeout?: number;
  eventTarget?: string;
}

/**
 * Listener invoked when a global event is dispatched.
 */
export type EventListener = (payload: GlobalEvent) => void;
