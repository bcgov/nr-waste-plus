import { Column } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, useMemo, type FC, type ReactNode } from 'react';

import { headers } from './constants';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { ApiError, ProblemDetails } from '@/config/api/types';
import type {
  ReportingUnitSearchParametersViewDto,
  ReportingUnitSearchResultDto,
} from '@/services/search.types';
import type { SortDirectionType } from '@/services/types';

import TableResource from '@/components/Form/TableResource';
import WasteSearchFilters from '@/components/waste/WasteSearch/WasteSearchFilters';
import WasteSearchTableExpandContent from '@/components/waste/WasteSearch/WasteSearchTableExpandContent';
import useSendEvent from '@/hooks/useSendEvent';
import API from '@/services/APIs';
import { reportingUnitSearchParametersView2Plain } from '@/services/search.utils';
import { removeEmpty, generateSortArray } from '@/services/utils';

import './index.scss';

/**
 * Coordinates waste-search filters, results, pagination, sorting, and row expansion.
 *
 * @returns The waste search table view.
 */
const WasteSearchTable: FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<ReportingUnitSearchParametersViewDto>({});
  const [sort, setSort] = useState<Record<string, SortDirectionType>>({});
  const [searchTrigger, setSearchTrigger] = useState(0);
  const { sendEvent, clearEvents } = useSendEvent();

  const plainFilters = useMemo(() => reportingUnitSearchParametersView2Plain(filters), [filters]);

  const { data, isLoading, isFetching, isError, refetch, error } = useQuery({
    queryKey: ['search', 'ru', { page: currentPage, size: pageSize, ...plainFilters, ...sort }],
    queryFn: () =>
      API.search.searchReportingUnit(plainFilters, {
        page: currentPage,
        size: pageSize,
        sort: generateSortArray<ReportingUnitSearchResultDto>(sort),
      }),
    enabled: false,
    gcTime: 0,
    staleTime: Infinity,
  });

  /**
   * Runs a search using the current filter, sort, and pagination state.
   *
   * @param pageOverride Optional page number to apply before searching.
   * @param pageSizeOverride Optional page size to apply before searching.
   */
  const executeSearch = (pageOverride?: number, pageSizeOverride?: number) => {
    clearEvents('waste-search');
    const cleanedFilters = removeEmpty(plainFilters);
    setCurrentPage(pageOverride ?? currentPage);
    setPageSize(pageSizeOverride ?? pageSize);
    if (Object.keys(cleanedFilters).length > 0) {
      // Increment trigger to signal that state has settled and we should fetch.
      // This explicit pattern avoids the implicit timing contract of setTimeout,
      // ensuring the effect fires after React's synchronous state flush completes.
      setSearchTrigger((n) => n + 1);
    }
  };

  /**
   * Starts a new search from the first page.
   */
  const executeNewSearch = () => {
    executeSearch(0, pageSize);
  };

  /**
   * Applies a table page change and fetches the corresponding result set.
   *
   * @param paging The requested page and page size.
   */
  const handlePageChange = ({ page, pageSize }: { page: number; pageSize: number }) => {
    const adjustedPage = Math.min(Math.max(page, 0), (data?.page.totalPages ?? 1) - 1); // Adjust for zero-based index
    executeSearch(adjustedPage, pageSize);
  };

  /**
   * Applies updated sort keys and reruns the current search.
   *
   * @param sortingKeys The next table sort definition.
   */
  const handleSort = (sortingKeys: Record<string, SortDirectionType>) => {
    setSort(sortingKeys);
    executeSearch(currentPage, pageSize);
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

  useEffect(() => {
    if (searchTrigger > 0) {
      refetch();
    }
  }, [searchTrigger, refetch]);

  useEffect(() => {
    if (isError && error) {
      const problemDetails = (error as ApiError).body as ProblemDetails;
      sendEvent({
        title: problemDetails.title,
        description: problemDetails.detail || 'No additional details provided.',
        eventType: 'error',
        eventTarget: 'waste-search',
      });
    }
  }, [isError, error, sendEvent]);

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
        />
      </Column>
    </>
  );
};

export default WasteSearchTable;
