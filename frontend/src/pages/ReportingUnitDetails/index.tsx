import { Column } from '@carbon/react';
import { useLoaderData } from '@tanstack/react-router';
import { type FC } from 'react';

import type { ReportingUnitDto } from '@/services/types';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import LegacyDataTag from '@/components/core/Tags/LegacyDataTag';
import TagWrapper from '@/components/core/Tags/TagWrapper';
import UnderConstructionTag from '@/components/core/Tags/UnderConstructionTag';
import ReportingUnitDetailsTombstone from '@/components/waste/ReportingUnits/ReportingUnitDetailsTombstone';

import './index.scss';

/**
 * Page component that renders the Reporting Unit Details view.
 *
 * Reads the pre-fetched {@link ReportingUnitDto} from the TanStack Router loader
 * context and renders the tombstone panel, page title, and inline notifications.
 * Shows a legacy-data tag when the unit has no grade code, and always renders
 * an under-construction tag while the page is in development.
 *
 * @returns The Reporting Unit Details page layout.
 */
const ReportingUnitDetailsPage: FC = () => {
  const data = useLoaderData({ strict: false }) as ReportingUnitDto;

  return (
    <>
      <Column lg={16} md={8} sm={4} className="rudetail-column__banner">
        <TagWrapper
          position="right"
          enabled={!data.grade?.code}
          tag={
            <LegacyDataTag
              url={`/waste101ReportUnitDetailsAction.do?dataBean.p_reporting_unit_id=${data.id}`}
            />
          }
        >
          <TagWrapper position="right" tag={<UnderConstructionTag type="page" />}>
            <PageTitle
              title={`Reporting Unit no.: ${data.id}`}
              subtitle="Start a new waste submission by creating a reporting unit"
            />
          </TagWrapper>
        </TagWrapper>
      </Column>
      <Column lg={16} md={8} sm={4} className="notification-column">
        <PageNotification eventTarget="ru-details" />
      </Column>
      <ReportingUnitDetailsTombstone data={data} />
    </>
  );
};

export default ReportingUnitDetailsPage;
