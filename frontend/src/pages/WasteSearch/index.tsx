import { Column, InlineNotification } from '@carbon/react';
import { useState, type FC } from 'react';

import type { GlobalEvent } from '@/hooks/useSendEvent/types';

import PageTitle from '@/components/core/PageTitle';
import WasteSearch from '@/components/waste/WasteSearch/WasteSearchTable';
import useSendEvent from '@/hooks/useSendEvent';

import './index.scss';

const WasteSearchPage: FC = () => {
  const [eventNotification, setEventNotification] = useState<GlobalEvent | undefined>(undefined);
  const { subscribe } = useSendEvent();

  subscribe('error', (payload) => {
    if (payload.eventTarget !== 'waste-search') return;
    setEventNotification(payload);
  });

  subscribe('warning', (payload) => {
    if (payload.eventTarget !== 'waste-search') return;
    setEventNotification(payload);
  });

  subscribe('info', (payload) => {
    if (payload.eventTarget !== 'waste-search') return;
    setEventNotification(payload);
  });

  return (
    <>
      <Column lg={16} md={8} sm={4} className="search-column__banner">
        <PageTitle
          title="Waste search"
          subtitle="Search for reporting units, licensees, or blocks"
        />
      </Column>
      <Column lg={16} md={8} sm={4} className="notification-column">
        {eventNotification && eventNotification.title && (
          <InlineNotification
            lowContrast
            aria-label={`Closes ${eventNotification.eventType} notification`}
            kind={eventNotification.eventType}
            onClose={() => setEventNotification(undefined)}
            onCloseButtonClick={() => setEventNotification(undefined)}
            role="alert"
            statusIconDescription={eventNotification.description}
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
