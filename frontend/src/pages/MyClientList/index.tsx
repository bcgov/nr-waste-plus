import { Column, InlineNotification } from '@carbon/react';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';
import MyClientListing from '@/components/waste/MyClientListing';
import { eventIconDescription } from '@/hooks/useNotificationEvents/eventHandler';
import useScopedNotification from '@/hooks/useNotificationEvents/useScopedNotification';

import './index.scss';

/**
 * Hosts the saved client list page and its page-scoped notifications.
 *
 * @returns The my clients page.
 */
const MyClientListPage: FC = () => {
  const { clearNotification, eventNotification } = useScopedNotification('my-client-list');

  return (
    <>
      <Column lg={16} md={8} sm={4} className="search-column__banner">
        <PageTitle title="My clients" />
      </Column>
      <Column lg={16} md={8} sm={4} className="notification-column">
        {eventNotification?.title && (
          <InlineNotification
            lowContrast
            aria-label={`Closes ${eventNotification.eventType} notification`}
            kind={eventNotification.eventType}
            onClose={clearNotification}
            onCloseButtonClick={clearNotification}
            role="alert"
            statusIconDescription={eventIconDescription(eventNotification)}
            subtitle={eventNotification.description}
            title={eventNotification.title}
          />
        )}
      </Column>
      <MyClientListing />
    </>
  );
};

export default MyClientListPage;
