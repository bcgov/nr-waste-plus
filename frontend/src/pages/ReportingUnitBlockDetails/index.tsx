import { ArrowLeft } from '@carbon/icons-react';
import { Button, Column } from '@carbon/react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useEffect, useRef, type FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import TableResource from '@/components/Form/TableResource';
import BlockDetailsSkeleton from '@/components/waste/ReportingUnits/BlockDetailsSkeleton';
import BlockDetailsSummary from '@/components/waste/ReportingUnits/BlockDetailsSummary';
import { useReportingUnitDetailsQuery } from '@/config/react-query/hooks';
import useDelayedFlag from '@/hooks/useDelayedFlag';
import { navigateInTree } from '@/routes/inTreePaths';

import type { PageableResponse, TableHeaderType } from '@/components/Form/TableResource/types';

import './index.scss';

/**
 * Event target used to scope the inline error notification rendered by
 * {@link PageNotification} on this page.
 */
const EVENT_TARGET = 'reporting-unit-block-details';

/** Row shape of the waste-volume results table (populated once slice 3 lands). */
type BlockResultsRow = { id: number };

/**
 * Empty column definitions. The results table is rendered through
 * {@link TableResource} so its built-in empty state is reused; row columns
 * and status tags arrive with slice 3.
 */
const EMPTY_RESULTS_HEADERS: TableHeaderType<BlockResultsRow>[] = [];

/** Empty page payload that drives {@link TableResource}'s "No results" state. */
const EMPTY_RESULTS_CONTENT: PageableResponse<BlockResultsRow> = {
  content: [],
  page: { size: 10, number: 0, totalElements: 0, totalPages: 0 },
};

/**
 * Read-only District Average block details page for a single reporting unit.
 *
 * Route: `/reporting-units/$ruId/blocks/$blockId` (issue #1369).
 *
 * Fetches the reporting unit through {@link useReportingUnitDetailsQuery} and renders
 * the page banner (breadcrumb + focusable `h1`), the {@link BlockDetailsSummary}
 * card, an empty {@link TableResource} results region, and a Back action. Errors
 * surface an inline `role="alert"` notification with a Retry action; the loading
 * skeleton is deferred by 300 ms via `useDelayedFlag`.
 *
 * @returns The block details page columns, ready for the layout `Grid`.
 */
const ReportingUnitBlockDetailsPage: FC = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const ruId = Number(params.ruId);
  const blockId = Number(params.blockId);

  const { data, isLoading, isError, refetch } = useReportingUnitDetailsQuery(ruId, {
    notificationTarget: EVENT_TARGET,
  });

  const showSkeleton = useDelayedFlag(isLoading);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Move focus to the h1 once the page has real content (after data resolves).
  useEffect(() => {
    if (isLoading || isError || !data) {
      return;
    }

    const heading = bannerRef.current?.querySelector('h1');
    if (!heading) {
      return;
    }

    heading.setAttribute('tabindex', '-1');
    heading.focus();
  }, [data, isError, isLoading]);

  if (isLoading) {
    return showSkeleton ? <BlockDetailsSkeleton /> : null;
  }

  if (isError || !data) {
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
          <Button kind="primary" onClick={() => void refetch()} data-testid="rublock-retry">
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
        <PageTitle
          title={`Reporting Unit No. ${ruId}`}
          subtitle="View reporting unit details"
          breadCrumbs={[
            { name: 'Reporting unit', path: `/reporting-units/${ruId}` },
            { name: 'Blocks', path: `/reporting-units/${ruId}/blocks/${blockId}` },
          ]}
        />
      </Column>
      <Column lg={16} md={8} sm={4} className="notification-column">
        <PageNotification eventTarget={EVENT_TARGET} />
      </Column>
      <Column lg={16} md={8} sm={4} className="rublock-column__summary">
        <BlockDetailsSummary data={data} />
      </Column>
      <Column lg={16} md={8} sm={4} className="rublock-column__results">
        <TableResource
          id="block-details-results"
          headers={EMPTY_RESULTS_HEADERS}
          content={EMPTY_RESULTS_CONTENT}
          loading={false}
          error={isError}
        />
      </Column>
      <Column
        lg={16}
        md={8}
        sm={4}
        className="rublock-column__actions"
        data-testid="rublock-actions"
      >
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
};

export default ReportingUnitBlockDetailsPage;
