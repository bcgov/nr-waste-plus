import { Column } from '@carbon/react';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';
import MyClientListing from '@/components/waste/MyClientListing';

import './index.scss';

const MyClientListPage: FC = () => {
  return (
    <>
      <Column lg={16} md={8} sm={4} className="search-column__banner">
        <PageTitle title="My clients" />
      </Column>
      <MyClientListing />
    </>
  );
};

export default MyClientListPage;
