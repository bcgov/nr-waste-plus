import { Column } from '@carbon/react';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';

const ReportingUnitCreatePage: FC = () => {
  return (
    <Column lg={16} md={8} sm={4} className="dashboard-column__banner">
      <PageTitle
        title="Create reporting unit"
        subtitle="Start a new waste submission by creating a reporting unit."
      />
    </Column>
  );
};

export default ReportingUnitCreatePage;
