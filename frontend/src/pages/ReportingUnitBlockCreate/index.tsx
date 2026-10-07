import { Button, Column, Tag } from '@carbon/react';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, type FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import BlockDetailsSkeleton from '@/components/waste/ReportingUnits/BlockDetailsSkeleton';
import ReportingUnitDetailsTombstone from '@/components/waste/ReportingUnits/ReportingUnitDetailsTombstone';
import { useReportingUnitDetailsQuery } from '@/config/react-query/hooks';
import useDelayedFlag from '@/hooks/useDelayedFlag';
import { navigateInTree } from '@/routes/inTreePaths';

import BlockWizardShell from './BlockWizardShell';
import SubmissionProgress from './SubmissionProgress';

import type { BlockWizardSearch } from '@/routes/routePaths';

import './index.scss';

/**
 * Event target used to scope the inline error notification rendered by
 * {@link PageNotification} on this page.
 */
const EVENT_TARGET = 'block-create';

/**
 * Block creation wizard shell page for a District Average block (issue #1254).
 *
 * Route: `/reporting-units/$ruId/blocks/create` with
 * `?blockId={id}&blockState={state}` search params set by the create action.
 *
 * Renders the page banner (breadcrumb `RU No. {ruId}` + `Block ID {blockId}`
 * heading + status tag), the reporting-unit tombstone, the `Submission
 * progress` section (ProgressIndicator + summary card), and the
 * {@link BlockWizardShell} tab frame that hosts the child tab screens from
 * #1239/#1255, #1240, #1242/#1256, #1243. Errors surface an inline `role="alert"`
 * notification with a Retry action; the loading skeleton is deferred by 300 ms
 * via `useDelayedFlag`.
 *
 * @returns The block-wizard page columns, ready for the layout `Grid`.
 */
const ReportingUnitBlockCreatePage: FC = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const search = useSearch({ strict: false }) as Partial<BlockWizardSearch> | undefined;
  const ruId = Number(params.ruId);
  const blockId = Number(search?.blockId);
  const blockState = search?.blockState ?? 'DRAFT';

  const { data, isLoading, isError, refetch } = useReportingUnitDetailsQuery(ruId, {
    notificationTarget: EVENT_TARGET,
  });

  const showSkeleton = useDelayedFlag(isLoading);
  const bannerRef = useRef<HTMLDivElement>(null);

  const blockIdValid = Number.isFinite(blockId) && blockId > 0;
  const statusLabel = blockState === 'DRAFT' ? 'Draft' : blockState;

  // Move focus to the h1 once the page has real content (after data resolves).
  useEffect(() => {
    if (isLoading || isError || !data || !blockIdValid) {
      return;
    }

    const heading = bannerRef.current?.querySelector('h1');
    if (!heading) {
      return;
    }

    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }, [data, isError, isLoading, blockIdValid]);

  if (isLoading) {
    return showSkeleton ? <BlockDetailsSkeleton /> : null;
  }

  if (isError || !data || !blockIdValid) {
    return (
      <>
        <Column lg={16} md={8} sm={4} className="rubc-column__banner">
          <PageTitle
            title="Reporting Unit Block not found"
            subtitle="Required data is missing or an error occurred while loading."
          />
        </Column>
        <Column lg={16} md={8} sm={4} className="notification-column">
          <PageNotification eventTarget={EVENT_TARGET} />
        </Column>
        <Column lg={16} md={8} sm={4} className="rubc-column__actions" data-testid="rubc-actions">
          <Button kind="primary" onClick={() => void refetch()} data-testid="rubc-retry">
            Retry
          </Button>
          <Button
            kind="secondary"
            onClick={() => navigateInTree(navigate, `/reporting-units/${ruId}`)}
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
        className="rubc-column__banner"
        data-testid="rubc-banner"
        ref={bannerRef}
      >
        <PageTitle
          title={`Block ID ${blockId}`}
          subtitle="View block details"
          breadCrumbs={[{ name: `RU No. ${ruId}`, path: `/reporting-units/${ruId}` }]}
        >
          <Tag type="outline" data-testid="block-status-tag">
            {statusLabel}
          </Tag>
        </PageTitle>
      </Column>
      <Column lg={16} md={8} sm={4} className="notification-column">
        <PageNotification eventTarget={EVENT_TARGET} />
      </Column>
      <ReportingUnitDetailsTombstone data={data} />
      <SubmissionProgress data={data} />
      <Column lg={16} md={8} sm={4} className="rubc-column__wizard">
        <BlockWizardShell blockState={blockState} />
      </Column>
    </>
  );
};

export default ReportingUnitBlockCreatePage;
