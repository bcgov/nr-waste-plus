import { type FC, useEffect, useState } from 'react';

import { dispatchNotificationEvent } from '@/context/notification/eventBridge';
import { type NotificationContent } from '@/context/notification/NotificationContext';
import { useNotification } from '@/context/notification/useNotification';
import { type EventType, type GlobalEvent } from '@/types/notification.types';

const EVENT_TYPES: readonly EventType[] = ['error', 'info', 'success', 'warning'];
const MAX_LOG_ENTRIES = 50;

const sectionStyle = { margin: '0 0 8px' } as const;
const entryStyle = {
  alignItems: 'center',
  border: '1px solid #393939',
  borderRadius: 4,
  display: 'flex',
  gap: 8,
  justifyContent: 'space-between',
  padding: '4px 8px',
} as const;
const listStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
  listStyle: 'none',
  margin: 0,
  padding: 0,
} as const;

/**
 * Maps a toast kind back to the event severity that can travel the
 * dispatcher pipeline — Carbon-only kinds (`info-square`, `warning-alt`,
 * `undefined`) fold onto their base severities, which `sendEvent` accepts.
 */
const toEventType = (kind: NotificationContent['kind']): EventType => {
  if (kind === 'info-square') {
    return 'info';
  }
  if (kind === 'warning-alt') {
    return 'warning';
  }
  return kind ?? 'info';
};

/**
 * Reconstructs the dispatcher event for a queued toast.
 *
 * A toast only reaches the queue because `resolveDisplayMode` returned
 * `toast` at dispatch time. When `scope` is set, the original event
 * necessarily carried `eventTarget` plus an explicit `displayMode: 'toast'`
 * (a target without it resolves to inline and never becomes a toast), so both
 * fields are restored — dropping them would re-dispatch the event unscoped or
 * inline and change its dedupe signature. Unscoped toasts re-resolve to
 * `toast` from the omitted fields alone.
 */
const toEvent = (content: NotificationContent): GlobalEvent => ({
  description: content.subtitle ?? '',
  displayMode: content.scope ? 'toast' : undefined,
  eventTarget: content.scope,
  eventType: toEventType(content.kind),
  timeout: content.timeout,
  title: content.title,
});

interface NotificationsEntryProps {
  readonly description: string;
  readonly label: string;
  readonly onRefire: () => void;
  readonly title: string;
}

const NotificationsEntry: FC<NotificationsEntryProps> = ({
  description,
  label,
  onRefire,
  title,
}) => (
  <li style={entryStyle}>
    <span>
      <strong>{title}</strong>
      {description ? ` — ${description}` : ''}
    </span>
    <button type="button" onClick={onRefire} aria-label={label}>
      Re-fire
    </button>
  </li>
);

/**
 * Devtools panel for nrw's notification pipeline.
 *
 * Lists the live toast queue from {@link useNotification} and a bounded log
 * of events observed through the context subscription. Both surfaces offer
 * re-fire buttons that push the entry back through
 * {@link dispatchNotificationEvent}, exercising the full
 * dispatcher → provider pipeline.
 *
 * The panel renders inside the devtools shell, which mounts under the
 * notification provider in `App`, so the context is always available.
 *
 * @returns The notifications devtools panel.
 */
const NotificationsPanel: FC = () => {
  const { notificationQueue, subscribe } = useNotification();
  const [eventLog, setEventLog] = useState<readonly GlobalEvent[]>([]);

  useEffect(() => {
    const unsubscribers = EVENT_TYPES.map((eventType) =>
      subscribe(eventType, (event) => {
        setEventLog((previous) => [event, ...previous].slice(0, MAX_LOG_ENTRIES));
      }),
    );
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [subscribe]);

  const refireEvent = (event: GlobalEvent) => {
    dispatchNotificationEvent(event);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 12 }}>
      <section aria-label="Live toast queue">
        <h3 style={sectionStyle}>Live toast queue ({notificationQueue.length})</h3>
        {notificationQueue.length === 0 ? (
          <p style={{ margin: 0 }}>No queued notifications.</p>
        ) : (
          <ul style={listStyle}>
            {notificationQueue.map((content, index) => (
              <NotificationsEntry
                key={`${content.title}-${content.subtitle ?? ''}-${index}`}
                description={content.subtitle ?? ''}
                label={`Re-fire notification ${content.title}`}
                onRefire={() => refireEvent(toEvent(content))}
                title={content.title}
              />
            ))}
          </ul>
        )}
      </section>
      <section aria-label="Notification event log">
        <h3 style={sectionStyle}>Event log ({eventLog.length})</h3>
        {eventLog.length === 0 ? (
          <p style={{ margin: 0 }}>No events observed yet.</p>
        ) : (
          <ul style={listStyle}>
            {eventLog.map((event, index) => (
              <NotificationsEntry
                key={`${event.title}-${event.description}-${index}`}
                description={event.description}
                label={`Re-fire event ${event.title}`}
                onRefire={() => refireEvent(event)}
                title={`${event.eventType}: ${event.title}`}
              />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

export default NotificationsPanel;
