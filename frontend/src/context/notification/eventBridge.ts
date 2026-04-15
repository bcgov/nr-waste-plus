import type { GlobalEvent } from '@/hooks/useNotificationEvents/types';

type EventDispatcher = (event: GlobalEvent) => void;

let dispatcher: EventDispatcher | null = null;
let pendingEvents: GlobalEvent[] = [];

export const dispatchNotificationEvent = (event: GlobalEvent) => {
  if (dispatcher) {
    dispatcher(event);
    return;
  }

  pendingEvents = [...pendingEvents, event];
};

export const registerNotificationEventDispatcher = (nextDispatcher: EventDispatcher) => {
  dispatcher = nextDispatcher;

  if (pendingEvents.length > 0) {
    for (const pendingEvent of pendingEvents) {
      nextDispatcher(pendingEvent);
    }
    pendingEvents = [];
  }

  return () => {
    if (dispatcher === nextDispatcher) {
      dispatcher = null;
    }
  };
};
