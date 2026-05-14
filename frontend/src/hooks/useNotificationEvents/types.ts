/**
 * Event severities supported by the notification event pipeline.
 */
export type EventType = 'error' | 'info' | 'success' | 'warning';

/**
 * Determines how a notification event should be rendered.
 */
export type NotificationDisplayMode = 'inline' | 'toast';

/**
 * Payload published through the application notification pipeline.
 */
export interface GlobalEvent {
  title: string;
  description: string;
  eventType: EventType;
  timeout?: number;
  eventTarget?: string;
  displayMode?: NotificationDisplayMode;
  meta?: Record<string, unknown>;
}

/**
 * Listener invoked when a notification event is dispatched.
 */
export type EventListener = (payload: GlobalEvent) => void;
