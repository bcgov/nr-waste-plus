import { InlineNotification } from '@carbon/react';
import { type FC } from 'react';

import { eventIconDescription } from '@/hooks/useNotificationEvents/eventHandler';
import useScopedNotification from '@/hooks/useNotificationEvents/useScopedNotification';

/**
 * Props for the {@link PageNotification} component.
 */
interface PageNotificationProps {
  /** The unique event target/scope string to listen for (matching `eventTarget` in dispatched events). */
  readonly eventTarget: string;
  /** Optional class name to apply to the notification container. */
  readonly className?: string;
}

/**
 * Renders a standard Carbon {@link InlineNotification} that automatically subscribes to
 * notification events matching the provided `eventTarget`.
 *
 * This component abstracts the use of {@link useScopedNotification} and provides a consistent
 * way to display page-level or feature-level inline notifications.
 *
 * @param props - Component props.
 * @param props.eventTarget - The scope identifier for matching events.
 * @param props.className - Optional CSS class for the notification.
 * @returns The rendered notification if an event is active, otherwise null.
 */
const PageNotification: FC<PageNotificationProps> = ({
  eventTarget,
  className,
}: PageNotificationProps) => {
  const { clearNotification, eventNotification } = useScopedNotification(eventTarget);

  if (!eventNotification?.title) {
    return null;
  }

  return (
    <InlineNotification
      lowContrast
      className={className}
      aria-label={`Closes ${eventNotification.eventType} notification`}
      kind={eventNotification.eventType}
      onClose={clearNotification}
      onCloseButtonClick={clearNotification}
      role="alert"
      statusIconDescription={eventIconDescription(eventNotification)}
      subtitle={eventNotification.description}
      title={eventNotification.title}
    />
  );
};

export default PageNotification;
