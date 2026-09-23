import { Column } from '@carbon/react';
import { useEffect, useState, useMemo, type FC, type ReactNode } from 'react';

import { headers } from './constants';
import { useWasteSearchRowActions } from './rowActions.tsx';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type {
  ReportingUnitSearchParametersViewDto,
  ReportingUnitSearchResultDto,
} from '@/services/search.types';

import TableResource from '@/components/Form/TableResource';
import WasteSearchFilters from '@/components/waste/WasteSearch/WasteSearchFilters';
import WasteSearchTableExpandContent from '@/components/waste/WasteSearch/WasteSearchTableExpandContent';
import { useSearchReportingUnitsQuery } from '@/config/react-query/hooks';
import { useListTablePagination } from '@/hooks/useTableRow';
import { featureFlags } from '@/env';
import useNotificationEvents from '@/hooks/useNotificationEvents';
import { reportingUnitSearchParametersView2Plain } from '@/services/search.utils';
import { removeEmpty } from '@/services/utils';

import './index.scss';

/**
 * Coordinates waste-search filters, results, pagination, sorting, and row expansion.
 *
 * Uses {@link useListTablePagination} for pagination state and calls
 * {@link useSearchReportingUnitsQuery} directly at the top level so the
 * React hook call is not wrapped in a callback (satisfying rules-of-hooks).
 *
 * @returns The waste search table view.
 */
const WasteSearchTable: FC = () => {
  const [filters, setFilters] = useState<ReportingUnitSearchParametersViewDto>({});
  const { clearEvents } = useNotificationEvents();

  const { sendInlineEvent } = useNotificationEvents();
  const plainFilters = useMemo(() => reportingUnitSearchParametersView2Plain(filters), [filters]);

  const hasFilters = useMemo(
    () => Object.keys(removeEmpty(plainFilters)).length > 0,
    [plainFilters],
  );

  const { page, size, sort, searchTrigger, executeSearch, handleSort, isSearchEnabled } =
    useListTablePagination({ filters: plainFilters, enabled: hasFilters });

  const { data, isLoading, isFetching, isError, refetch } = useSearchReportingUnitsQuery(
    { page, size, sort, filters: plainFilters },
    { enabled: false, gcTime: 0, notificationTarget: 'waste-search', staleTime: Infinity },
  );

  useEffect(() => {
    if (searchTrigger > 0) {
      refetch();
    }
  }, [searchTrigger, refetch]);

  useEffect(() => {
    if (isSearchEnabled()) {
      refetch();
    }
    // Mount-only: skip auto-fetch when filters are empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch]);

  const getRowActions = useWasteSearchRowActions({
    sendInlineEvent,
    onToggleRefresh: () => refetch(),
  });

  /**
   * Starts a new search from the first page.
   */
  const executeNewSearch = () => {
    clearEvents('waste-search');
    executeSearch(0, 10, { resetPage: true });
  };

  /**
   * Resolves the expandable row content for a specific result row.
   *
   * @param rowId The identifier of the expanded row.
   * @returns The expand-content component for that row.
   */
  const onRowExpanded = (rowId: string | number): Promise<ReactNode> => {
    return Promise.resolve(<WasteSearchTableExpandContent rowId={String(rowId)} />);
  };

  const handlePageChange = ({ page, pageSize }: { page: number; pageSize: number }) => {
    const maxPage = Math.max((data?.page.totalPages ?? 1) - 1, 0);
    const adjustedPage = Math.min(Math.max(page, 0), maxPage);
    executeSearch(adjustedPage, pageSize);
  };

  return (
    <>
      <Column lg={16} md={8} sm={4} className="search-filters">
        <WasteSearchFilters value={filters} onChange={setFilters} onSearch={executeNewSearch} />
      </Column>

      <Column lg={16} md={8} sm={4} className="search-table">
        <TableResource
          id="waste-search"
          headers={headers}
          content={data ?? ({} as PageableResponse<ReportingUnitSearchResultDto>)}
          loading={isLoading}
          error={!isFetching && isError}
          onPageChange={handlePageChange}
          displayRange
          displayToolbar
          onSortChange={handleSort}
          onRowExpanded={onRowExpanded}
          getRowActions={featureFlags['bookmark-ru-enabled'] ? getRowActions : undefined}
        />
      </Column>
    </>
  );
};

export default WasteSearchTable;
