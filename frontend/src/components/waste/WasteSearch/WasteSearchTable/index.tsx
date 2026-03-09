import { Column } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type FC, type ReactNode } from 'react';

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
import useSyncFiltersToSearchParams from '@/hooks/useSyncFiltersToSearchParams';
import API from '@/services/APIs';
import { reportingUnitSearchParametersView2Plain } from '@/services/search.utils';
import { removeEmpty, generateSortArray } from '@/services/utils';

import './index.scss';

const WasteSearchTable: FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<ReportingUnitSearchParametersViewDto>({});
  const [sort, setSort] = useState<Record<string, SortDirectionType>>({});
  const { sendEvent, clearEvents } = useSendEvent();

  // Sync filters with URL search parameters
  useSyncFiltersToSearchParams(filters, setFilters);

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

  const executeSearch = (pageOverride?: number, pageSizeOverride?: number) => {
    clearEvents('waste-search');
    const cleanedFilters = removeEmpty(plainFilters);
    setCurrentPage(pageOverride ?? currentPage);
    setPageSize(pageSizeOverride ?? pageSize);
    if (Object.keys(cleanedFilters).length > 0) {
      setTimeout(refetch, 1);
    }
  };

  const executeNewSearch = () => {
    executeSearch(0, pageSize);
  };

  const handlePageChange = ({
    page,
    pageSize: newPageSize,
  }: {
    page: number;
    pageSize: number;
  }) => {
    const adjustedPage = Math.min(Math.max(page, 0), (data?.page.totalPages ?? 1) - 1); // Adjust for zero-based index
    executeSearch(adjustedPage, newPageSize);
  };

  const handleSort = (sortingKeys: Record<string, SortDirectionType>) => {
    setSort(sortingKeys);
    executeSearch(currentPage, pageSize);
  };

  const onRowExpanded = (rowId: string | number): Promise<ReactNode> => {
    return Promise.resolve(<WasteSearchTableExpandContent rowId={String(rowId)} />);
  };

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
