import type { GlobalEvent, EventType } from './types';

import { dispatchNotificationEvent } from '@/context/notification/eventBridge.ts';

const EVENT_TYPES = new Set<EventType>(['error', 'info', 'success', 'warning']);

/**
 * Sends an application notification through the notification provider bridge.
 * @param detail - The event payload to send.
 */
export const sendEvent = (detail: GlobalEvent) => {
  dispatchNotificationEvent(detail);
};

/**
 * Sends a notification that should always render as a toast.
 * @param detail - The event payload to send.
 */
export const sendToastEvent = (detail: Omit<GlobalEvent, 'displayMode'>) => {
  sendEvent({
    ...detail,
    displayMode: 'toast',
  });
};

/**
 * Sends a notification that should always render inline.
 * @param detail - The event payload to send.
 */
export const sendInlineEvent = (detail: Omit<GlobalEvent, 'displayMode'>) => {
  sendEvent({
    ...detail,
    displayMode: 'inline',
  });
};

export const clearEvents = (eventTarget?: string) => {
  sendInlineEvent({
    description: eventTarget ?? '',
    eventTarget,
    eventType: 'info',
    title: 'clear-events',
  });
};

export const eventHandler = {
  dispatch(eventName: EventType, payload: GlobalEvent) {
    if (eventName !== payload.eventType || !EVENT_TYPES.has(eventName)) {
      return;
    }

    dispatchNotificationEvent(payload);
  },
};

export const eventIconDescription = (event: GlobalEvent) => {
  switch (event.eventType) {
    case 'error':
      return 'Error icon';
    case 'warning':
      return 'Warning icon';
    case 'info':
      return 'Info icon';
    default:
      return 'Notification icon';
  }
};
