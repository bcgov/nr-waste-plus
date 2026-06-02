import { Column } from '@carbon/react';

import type { FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import ReportingUnitCreate from '@/components/waste/ReportingUnits/ReportingUnitCreate';
import { featureFlags } from '@/env';

import './index.scss';

const ReportingUnitCreatePage: FC = () => {
  if (!featureFlags['reporting-unit-create-enabled']) {
    return null;
  }

  return (
    <>
      <Column lg={16} md={8} sm={4} className="create-ru-column__banner">
        <PageTitle
          title="Create reporting unit"
          subtitle="Start a new waste submission by creating a reporting unit"
        />
      </Column>

      <Column lg={16} md={8} sm={4} className="create-ru-column__notification">
        <PageNotification eventTarget="create-ru" />
      </Column>

      <ReportingUnitCreate />
      <Column max={10} xlg={10} lg={10} md={4} sm={0} className="create-ru-column__spacer"></Column>
    </>
  );
};

export default ReportingUnitCreatePage;
