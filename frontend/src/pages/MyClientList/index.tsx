import { Column } from '@carbon/react';
import { type FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import MyClientListing from '@/components/waste/MyClientListing';

import './index.scss';

/**
 * My Clients page — hosts the saved client listing and page-scoped notifications.
 *
 * Subscribes to the `'my-client-list'` notification target via
 * a {@link PageNotification} so that errors and warnings raised by
 * {@link MyClientListing} are surfaced directly on this page.
 * The notification is dismissed by the close button or
 * cleared programmatically by the listing component before each new search.
 *
 * @returns The My Clients page columns (title, optional notification, and listing).
 */
const MyClientListPage: FC = () => {
  return (
    <>
      <Column lg={16} md={8} sm={4} className="search-column__banner">
        <PageTitle title="My clients" />
      </Column>
      <Column lg={16} md={8} sm={4} className="notification-column">
        <PageNotification eventTarget="my-client-list" />
      </Column>
      <MyClientListing />
    </>
  );
};

export default MyClientListPage;
