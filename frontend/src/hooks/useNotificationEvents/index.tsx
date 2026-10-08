import type { GlobalEvent } from './types';

import { useNotification } from '@/context/notification/useNotification';

/**
 * React hook for publishing and subscribing to application notification events.
 *
 * @returns Notification event helpers.
 */
const useNotificationEvents = () => {
  const { sendEvent, subscribe, unsubscribe, clearEvents } = useNotification();

  const sendToastEvent = (event: Omit<GlobalEvent, 'displayMode'>) => {
    sendEvent({
      ...event,
      displayMode: 'toast',
    });
  };

  const sendInlineEvent = (event: Omit<GlobalEvent, 'displayMode'>) => {
    sendEvent({
      ...event,
      displayMode: 'inline',
    });
  };

  return {
    clearEvents,
    sendEvent,
    sendInlineEvent,
    sendToastEvent,
    subscribe,
    unsubscribe,
  };
};

export default useNotificationEvents;
