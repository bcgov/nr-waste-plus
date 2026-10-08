import { Column } from '@carbon/react';
import { useLoaderData } from '@tanstack/react-router';
import { type FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import LegacyDataTag from '@/components/core/Tags/LegacyDataTag';
import TagWrapper from '@/components/core/Tags/TagWrapper';
import UnderConstructionTag from '@/components/core/Tags/UnderConstructionTag';
import BlockCreateAction from '@/components/waste/ReportingUnits/BlockCreateAction';
import ReportingUnitBlocksList from '@/components/waste/ReportingUnits/ReportingUnitBlocksList';
import ReportingUnitDetailsTombstone from '@/components/waste/ReportingUnits/ReportingUnitDetailsTombstone';
import { useReportingUnitBlocksQuery } from '@/config/react-query/hooks';
import { featureFlags } from '@/env';

import type { ReportingUnitDto } from '@/services/types';

import './index.scss';

/**
 * Page component that renders the Reporting Unit Details view.
 *
 * Reads the pre-fetched {@link ReportingUnitDto} from the TanStack Router loader
 * context and renders the tombstone panel, page title, inline notifications, the
 * add-block panel, and the blocks table wired to the block-list query (issue
 * #1369/#1254), the latter only when the `reporting-unit-block-details-enabled`
 * feature flag is enabled.
 * Shows a legacy-data tag when the unit is flagged legacy (falling back to a
 * missing grade code), and always renders an under-construction tag while the
 * page is in development.
 *
 * @returns The Reporting Unit Details page layout.
 */
const ReportingUnitDetailsPage: FC = () => {
  const data = useLoaderData({ strict: false }) as ReportingUnitDto | undefined;

  const blocksListEnabled = featureFlags['reporting-unit-block-details-enabled'];

  // Hook must run before the defensive `!data` guard below (rules of hooks);
  // it stays disabled until the loader provided a unit and the flag is on.
  const blocksQuery = useReportingUnitBlocksQuery(data?.id ?? 0, {
    enabled: Boolean(data) && blocksListEnabled,
  });

  // Defensive guard: TanStack Router with `strict: false` can return `unknown`/`undefined`
  // if the loader was changed or the component is mounted outside the expected
  // route. Avoid dereferencing `data` below when it's missing and show a clear
  // fallback UI so the error is visible instead of throwing at runtime.
  if (!data) {
    return (
      <>
        <Column lg={16} md={8} sm={4} className="rudetail-column__banner">
          <PageTitle
            title="Reporting Unit not found"
            subtitle="Required data is missing or the route loader failed."
          />
        </Column>
        <Column lg={16} md={8} sm={4} className="notification-column">
          <PageNotification eventTarget="ru-details" />
        </Column>
      </>
    );
  }

  return (
    <>
      <Column lg={16} md={8} sm={4} className="rudetail-column__banner">
        <TagWrapper
          position="right"
          // API-driven once the backend ships `isLegacy`; grade fallback covers
          // the rollout window (units without a grade are legacy-only today).
          enabled={data.isLegacy ?? !data.grade?.code}
          tag={
            <LegacyDataTag
              url={`/waste101ReportUnitDetailsAction.do?dataBean.p_reporting_unit_id=${data.id}`}
            />
          }
        >
          <TagWrapper position="right" tag={<UnderConstructionTag type="page" />}>
            <PageTitle
              title={`Reporting Unit No. ${data.id}`}
              subtitle="View reporting unit details"
            />
          </TagWrapper>
        </TagWrapper>
      </Column>
      <Column lg={16} md={8} sm={4} className="notification-column">
        <PageNotification eventTarget="ru-details" />
      </Column>
      <ReportingUnitDetailsTombstone data={data} />
      <BlockCreateAction
        ruId={data.id}
        blockRule={data.blockRule}
        samplingCode={data.sampling?.code}
      />
      {blocksListEnabled && (
        <ReportingUnitBlocksList
          ruId={data.id}
          content={blocksQuery.data}
          isLoading={blocksQuery.isPending}
          isError={blocksQuery.isError}
        />
      )}
    </>
  );
};

export default ReportingUnitDetailsPage;
