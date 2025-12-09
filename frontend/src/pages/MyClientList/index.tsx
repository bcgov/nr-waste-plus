import { Column, InlineNotification } from '@carbon/react';
import { useEffect, useState, type FC } from 'react';

import type { GlobalEvent } from '@/hooks/useSendEvent/types';

import PageTitle from '@/components/core/PageTitle';
import MyClientListing from '@/components/waste/MyClientListing';
import useSendEvent from '@/hooks/useSendEvent';

import './index.scss';

const MyClientListPage: FC = () => {
  const [eventNotification, setEventNotification] = useState<GlobalEvent | undefined>(undefined);
  const { subscribe } = useSendEvent();

  useEffect(() => {
    const unsubscribeError = subscribe('error', (payload) => {
      if (payload.eventTarget !== 'my-client-list') return;
      setEventNotification(payload);
    });

    const unsubscribeWarning = subscribe('warning', (payload) => {
      if (payload.eventTarget !== 'my-client-list') return;
      setEventNotification(payload);
    });

    const unsubscribeInfo = subscribe('info', (payload) => {
      if (payload.eventTarget !== 'my-client-list') return;
      setEventNotification(payload);
    });

    return () => {
      unsubscribeError();
      unsubscribeWarning();
      unsubscribeInfo();
    };
  }, [subscribe]);
  return (
    <>
      <Column lg={16} md={8} sm={4} className="search-column__banner">
        <PageTitle title="My clients" />
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
      <MyClientListing />
    </>
  );
};

export default MyClientListPage;
