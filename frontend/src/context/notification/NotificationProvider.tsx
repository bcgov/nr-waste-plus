import { ToastNotification } from '@carbon/react';
import { useState, useEffect, type ReactNode, useCallback, useMemo, useRef } from 'react';

import { registerNotificationEventDispatcher } from './eventBridge.ts';
import { NotificationContext, type NotificationContent } from './NotificationContext';

import type {
  EventListener,
  EventType,
  GlobalEvent,
  NotificationDisplayMode,
} from '@/hooks/useNotificationEvents/types';

const DEFAULT_TIMEOUT = 5000;
const CLEAR_EVENTS_TITLE = 'clear-events';
const EVENT_TYPES = new Set<EventType>(['error', 'info', 'success', 'warning']);

const createNotificationSignature = (content: NotificationContent) =>
  content.dedupeKey ??
  [
    content.kind ?? '',
    content.scope ?? '',
    content.title,
    content.subtitle ?? '',
    content.caption ?? '',
  ].join('::');

const mapEventToNotification = (event: GlobalEvent): NotificationContent => ({
  dedupeKey: [event.eventType, event.eventTarget ?? '', event.title, event.description].join('::'),
  kind: event.eventType,
  scope: event.eventTarget,
  subtitle: event.description,
  timeout: event.timeout ?? DEFAULT_TIMEOUT,
  title: event.title,
});

const resolveDisplayMode = (event: GlobalEvent): NotificationDisplayMode => {
  if (event.displayMode) {
    return event.displayMode;
  }

  if (event.eventTarget || event.title === CLEAR_EVENTS_TITLE) {
    return 'inline';
  }

  return 'toast';
};

/**
 * Displays transient toast notifications and exposes a `display` helper through context.
 *
 * @param props The provider props.
 * @param props.children The subtree that can publish notifications.
 * @returns The notification provider and rendered toast container.
 */
export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notificationQueue, setNotificationQueue] = useState<NotificationContent[]>([]);
  const [notificationClass, setNotificationClass] = useState<string>('slide-in');
  const listenersRef = useRef<Record<EventType, Set<EventListener>>>({
    error: new Set(),
    info: new Set(),
    success: new Set(),
    warning: new Set(),
  });

  const notificationContent = notificationQueue[0] ?? null;

  const display = useCallback((content: NotificationContent) => {
    const signature = createNotificationSignature(content);
    setNotificationClass('slide-in');

    setNotificationQueue((currentQueue) => {
      if (
        currentQueue.some(
          (queuedNotification) => createNotificationSignature(queuedNotification) === signature,
        )
      ) {
        return currentQueue;
      }

      return [...currentQueue, content];
    });
  }, []);

  const unsubscribe = useCallback((eventName: EventType, listener: EventListener) => {
    listenersRef.current[eventName].delete(listener);
  }, []);

  const subscribe = useCallback(
    (eventName: EventType, listener: EventListener) => {
      listenersRef.current[eventName].add(listener);
      return () => unsubscribe(eventName, listener);
    },
    [unsubscribe],
  );

  const sendEvent = useCallback(
    (event: GlobalEvent) => {
      if (!EVENT_TYPES.has(event.eventType)) {
        return;
      }

      for (const listener of listenersRef.current[event.eventType]) {
        listener(event);
      }

      if (event.title === CLEAR_EVENTS_TITLE || resolveDisplayMode(event) !== 'toast') {
        return;
      }

      display(mapEventToNotification(event));
    },
    [display],
  );

  const clearEvents = useCallback(
    (eventTarget?: string) => {
      sendEvent({
        description: eventTarget ?? '',
        displayMode: 'inline',
        eventTarget,
        eventType: 'info',
        title: CLEAR_EVENTS_TITLE,
      });
    },
    [sendEvent],
  );

  const onClose = useCallback(() => {
    setNotificationClass('slide-in');
    notificationContent?.onClose?.();
    setNotificationQueue((currentQueue) => currentQueue.slice(1));
  }, [notificationContent]);

  useEffect(() => {
    if (notificationContent && notificationContent.timeout > 0) {
      if (notificationClass === 'slide-in') {
        const timer = setTimeout(() => {
          setNotificationClass('slide-out');
        }, notificationContent.timeout - 300);
        return () => clearTimeout(timer);
      }
    }
  }, [notificationClass, notificationContent]);

  useEffect(() => registerNotificationEventDispatcher(sendEvent), [sendEvent]);

  const contextValue = useMemo(
    () => ({ clearEvents, display, sendEvent, subscribe, unsubscribe }),
    [clearEvents, display, sendEvent, subscribe, unsubscribe],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {notificationContent && (
        <ToastNotification
          className={notificationClass}
          lowContrast
          aria-label="closes notification"
          caption={notificationContent.caption}
          kind={notificationContent.kind}
          onClose={onClose}
          onCloseButtonClick={notificationContent.onCloseButtonClick}
          statusIconDescription="notification"
          subtitle={notificationContent.subtitle}
          timeout={notificationContent.timeout}
          title={notificationContent.title}
        >
          {notificationContent.children}
        </ToastNotification>
      )}
    </NotificationContext.Provider>
  );
};

export default NotificationProvider;
