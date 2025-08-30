import { Column } from '@carbon/react';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';
import WasteSearch from '@/components/waste/WasteSearch/WasteSearchTable';

import './index.scss';

const WasteSearchPage: FC = () => {
  return (
    <>
      <Column lg={16} md={8} sm={4} className="search-column__banner">
        <PageTitle
          title="Waste search"
          subtitle="Search for reporting units, licensees, or blocks"
        />
      </Column>

      <WasteSearch />
    </>
  );
};

export default WasteSearchPage;
