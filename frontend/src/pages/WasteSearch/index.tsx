import { Column, InlineNotification } from '@carbon/react';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';
import WasteSearch from '@/components/waste/WasteSearch/WasteSearchTable';
import { eventIconDescription } from '@/hooks/useNotificationEvents/eventHandler';
import useScopedNotification from '@/hooks/useNotificationEvents/useScopedNotification';

import './index.scss';

/**
 * Waste Search page — hosts the search banner, page-scoped notifications, and results table.
 *
 * Subscribes to the `'waste-search'` notification target via
 * {@link useScopedNotification} so that errors, warnings, and info events raised
 * by the search table ({@link WasteSearch}) are displayed as a Carbon
 * {@link InlineNotification} directly on this page. The notification is cleared
 * before each new search by the table component.
 *
 * @returns The Waste Search page columns (title, optional notification, and search table).
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
