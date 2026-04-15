import { useEffect, useState } from 'react';

import useNotificationEvents from './index';

import type { EventType, GlobalEvent } from './types';

const PAGE_EVENT_TYPES: EventType[] = ['error', 'warning', 'info'];
const CLEAR_EVENTS_TITLE = 'clear-events';

/**
 * Tracks the latest page-scoped notification and clears it when a matching clear event is sent.
 *
 * @param eventTarget The page scope to listen for.
 * @returns The active notification and a dismiss handler.
 */
const useScopedNotification = (eventTarget: string) => {
  const [eventNotification, setEventNotification] = useState<GlobalEvent | undefined>(undefined);
  const { subscribe } = useNotificationEvents();

  useEffect(() => {
    const unsubscribeHandlers = PAGE_EVENT_TYPES.map((eventType) =>
      subscribe(eventType, (payload) => {
        if (payload.eventTarget !== eventTarget) {
          return;
        }

        if (payload.displayMode === 'toast') {
          return;
        }

        if (payload.title === CLEAR_EVENTS_TITLE) {
          setEventNotification(undefined);
          return;
        }

        setEventNotification(payload);
      }),
    );

    return () => {
      for (const unsubscribe of unsubscribeHandlers) {
        unsubscribe();
      }
    };
  }, [eventTarget, subscribe]);

  return {
    clearNotification: () => setEventNotification(undefined),
    eventNotification,
  };
};

export default useScopedNotification;
