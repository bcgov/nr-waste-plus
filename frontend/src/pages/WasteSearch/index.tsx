import { Column, InlineNotification } from '@carbon/react';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';
import WasteSearch from '@/components/waste/WasteSearch/WasteSearchTable';
import { eventIconDescription } from '@/hooks/useNotificationEvents/eventHandler';
import useScopedNotification from '@/hooks/useNotificationEvents/useScopedNotification';

import './index.scss';

/**
 * Hosts the waste search page banner, event notifications, and search results table.
 *
 * @returns The waste search page.
 */
const WasteSearchPage: FC = () => {
  const { clearNotification, eventNotification } = useScopedNotification('waste-search');

  return (
    <>
      <Column lg={16} md={8} sm={4} className="search-column__banner">
        <PageTitle
          title="Waste search"
          subtitle="Search for reporting units, licensees, or blocks"
        />
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
      <WasteSearch />
    </>
  );
};

export default WasteSearchPage;
