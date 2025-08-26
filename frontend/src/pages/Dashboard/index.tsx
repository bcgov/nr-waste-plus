import { Column } from '@carbon/react';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';

const DashboardPage: FC = () => {
  return (
    <Column lg={16} md={8} sm={4} className="dashboard-column__banner">
      <PageTitle title="Dashboard" subtitle="Overview of system status and metrics" />
    </Column>
  );
};

export default DashboardPage;
