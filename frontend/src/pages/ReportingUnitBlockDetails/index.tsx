import { ArrowLeft } from '@carbon/icons-react';
import {
  Button,
  Column,
  ProgressIndicator,
  ProgressIndicatorSkeleton,
  ProgressStep,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@carbon/react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useRef, type FC } from 'react';

import EmptySection from '@/components/core/EmptySection';
import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import LegacyDataTag from '@/components/core/Tags/LegacyDataTag';
import TagWrapper from '@/components/core/Tags/TagWrapper';
import UnderConstructionTag from '@/components/core/Tags/UnderConstructionTag';
import BlockDetailsSkeleton from '@/components/waste/ReportingUnits/BlockDetailsSkeleton';
import BlockDetailsSummary from '@/components/waste/ReportingUnits/BlockDetailsSummary';
import { useBlockDetailsQuery, useReportingUnitDetailsQuery } from '@/config/react-query/hooks';
import useDelayedFlag from '@/hooks/useDelayedFlag';
import { navigateInTree } from '@/routes/inTreePaths';

import './index.scss';

/**
 * Event target used to scope the inline error notification rendered by
 * {@link PageNotification} on this page.
 */
const EVENT_TARGET = 'reporting-unit-block-details';

/**
 * Read-only District Average block details page for a single reporting unit.
 *
 * Route: `/reporting-units/$ruId/$blockId` (issue #1369).
 *
 * Fetches the block through {@link useBlockDetailsQuery} (the authority on
 * block existence) and the reporting unit through
 * {@link useReportingUnitDetailsQuery} (which backs the
 * {@link BlockDetailsSummary} card), then renders the page banner (breadcrumb +
 * focusable `h1`), the summary card, and a Back action. Only a failed/missing
 * block query renders the not-found state (an inline `role="alert"` notification
 * with Retry/Back actions); a reporting-unit-only failure keeps the block page
 * and swaps the summary card for an inline error. The loading skeleton is
 * deferred by 300 ms via `useDelayedFlag`.
 *
 * @returns The block details page columns, ready for the layout `Grid`.
 */
const ReportingUnitBlockDetailsPage: FC = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const ruId = Number(params.ruId);
  const blockId = Number(params.blockId);

  const {
    data,
    isLoading: isRuLoading,
    isError: isRuError,
    refetch: refetchRu,
  } = useReportingUnitDetailsQuery(ruId, {
    notificationTarget: EVENT_TARGET,
  });

  const {
    data: blockData,
    isLoading: isBlockLoading,
    isError: isBlockError,
    refetch: refetchBlock,
  } = useBlockDetailsQuery(ruId, blockId, {
    notificationTarget: EVENT_TARGET,
  });

  const isLoading = isRuLoading || isBlockLoading;
  // The block query alone decides whether the page renders its not-found state;
  // a reporting-unit summary failure must not masquerade as a missing block.
  const isBlockMissing = isBlockError || !blockData;
  const isRuSummaryUnavailable = isRuError || !data;
  // Captured before the early returns so the legacy fallback below stays
  // `boolean | undefined` at the type level even once `blockData` is narrowed.
  const blockIsLegacy = blockData?.isLegacy;
  const legacyTagEnabled = data
    ? (blockIsLegacy ?? data.isLegacy ?? !data.grade?.code)
    : (blockIsLegacy ?? false);

  const showSkeleton = useDelayedFlag(isLoading);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Move focus to the h1 once the page has real content (after data resolves).
  useEffect(() => {
    if (isLoading || !data || !blockData) {
      return;
    }

    const heading = bannerRef.current?.querySelector('h1');
    if (!heading) {
      return;
    }

    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }, [data, blockData, isLoading]);

  if (isLoading) {
    return showSkeleton ? <BlockDetailsSkeleton /> : null;
  }

  if (isBlockMissing) {
    return (
      <>
        <Column lg={16} md={8} sm={4} className="rublock-column__banner">
          <PageTitle
            title="Reporting Unit Block not found"
            subtitle="Required data is missing or an error occurred while loading."
          />
        </Column>
        <Column lg={16} md={8} sm={4} className="notification-column">
          <PageNotification eventTarget={EVENT_TARGET} />
        </Column>
        <Column
          lg={16}
          md={8}
          sm={4}
          className="rublock-column__actions"
          data-testid="rublock-actions"
        >
          <Button
            kind="primary"
            onClick={() => {
              void refetchRu();
              void refetchBlock();
            }}
            data-testid="rublock-retry"
          >
            Retry
          </Button>
          <Button
            kind="secondary"
            onClick={() => navigateInTree(navigate, `/reporting-units/${ruId}`)}
            renderIcon={ArrowLeft}
          >
            Back
          </Button>
        </Column>
      </>
    );
  }

  return (
    <>
      <Column
        lg={16}
        md={8}
        sm={4}
        className="rublock-column__banner"
        data-testid="rublock-banner"
        ref={bannerRef}
      >
        <TagWrapper position="right" tag={<UnderConstructionTag type="page" />}>
          <TagWrapper
            position="right"
            // Block API's `isLegacy` wins once available; the RU grade
            // heuristic covers the rollout window (units without a grade are
            // legacy-only today).
            enabled={legacyTagEnabled}
            tag={
              <LegacyDataTag
                url={`/waste101ReportUnitDetailsAction.do?dataBean.p_reporting_unit_id=${ruId}`}
              />
            }
          >
            <PageTitle
              title={`Block ID ${blockId}`}
              subtitle="View block details"
              breadCrumbs={[
                { name: `Reporting unit ${ruId}`, path: `/reporting-units/${ruId}` },
                {
                  name: `Block ${blockId}` /* TODO: this id should be the block number, not the PK of the block */,
                  path: `/reporting-units/${ruId}/${blockId}`,
                },
              ]}
            />
          </TagWrapper>
        </TagWrapper>
      </Column>
      <Column lg={16} md={8} sm={4} className="notification-column">
        <PageNotification eventTarget={EVENT_TARGET} />
      </Column>
      <Column lg={16} md={8} sm={4} className="rublock-column__progress">
        {isLoading && <ProgressIndicatorSkeleton />}
        {!isLoading && (
          <ProgressIndicator currentIndex={0}>
            <ProgressStep
              current
              label="Step 1"
              description="Enter details and submit"
              secondaryLabel="Enter details and submit"
            />
            <ProgressStep
              label="Step 2"
              description="Ministry review"
              secondaryLabel="Ministry review"
            />
            <ProgressStep label="Step 3" description="Decision" secondaryLabel="Decision" />
          </ProgressIndicator>
        )}
      </Column>
      <Column lg={16} md={8} sm={4} className="rublock-column__summary">
        {data && !isRuSummaryUnavailable ? (
          <BlockDetailsSummary data={data} />
        ) : (
          <EmptySection
            className="initial-empty-section"
            title="Reporting unit summary unavailable"
            description="The reporting unit details could not be loaded. The block details above are unaffected."
          />
        )}
      </Column>
      <Column lg={16} md={8} sm={4} className="rublock-column__content">
        <Tabs defaultSelectedIndex={0}>
          <TabList aria-label="aria" contained size="lg">
            <Tab>Block details</Tab>
            <Tab>Area calculator</Tab>
            <Tab>Waste volumes</Tab>
            <Tab>Attachments</Tab>
            <Tab>Endorsement</Tab>
          </TabList>
          <TabPanels>
            <TabPanel>Block details content</TabPanel>
            <TabPanel>Area calculator content</TabPanel>
            <TabPanel>Waste volumes content</TabPanel>
            <TabPanel>Attachments content</TabPanel>
            <TabPanel>Endorsement content</TabPanel>
          </TabPanels>
        </Tabs>
      </Column>
      <Column
        lg={16}
        md={8}
        sm={4}
        className="rublock-column__actions"
        data-testid="rublock-actions"
      >
        <Button
          kind="tertiary"
          onClick={() => navigateInTree(navigate, `/reporting-units/${ruId}`)}
        >
          Save
        </Button>
        <Button kind="primary" onClick={() => navigateInTree(navigate, `/reporting-units/${ruId}`)}>
          Submit
        </Button>
      </Column>
    </>
  );
};

export default ReportingUnitBlockDetailsPage;
