import { Column } from '@carbon/react';
import { type FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import WasteSearch from '@/components/waste/WasteSearch/WasteSearchTable';

import './index.scss';

/**
 * Waste Search page — hosts the search banner, page-scoped notifications, and results table.
 *
 * Subscribes to the `'waste-search'` notification target via
 * a {@link PageNotification} so that errors, warnings, and info events raised
 * by the search table ({@link WasteSearch}) are displayed directly on this page.
 * The notification is cleared before each new search by the table component.
 *
 * @returns The Waste Search page columns (title, optional notification, and search table).
 */
const WasteSearchPage: FC = () => {
  return (
    <>
      <Column lg={16} md={8} sm={4} className="search-column__banner">
        <PageTitle
          title="Waste search"
          subtitle="Search for reporting units, licensees, or blocks"
        />
      </Column>
      <Column lg={16} md={8} sm={4} className="notification-column">
        <PageNotification eventTarget="waste-search" />
      </Column>
      <WasteSearch />
    </>
  );
};

export default WasteSearchPage;
