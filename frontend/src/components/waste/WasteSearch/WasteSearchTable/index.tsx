import { Column } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FC, type ReactNode } from 'react';

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

const WasteSearchTable: FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<ReportingUnitSearchParametersViewDto>({});
  const [sort, setSort] = useState<Record<string, SortDirectionType>>({});
  const { sendEvent, clearEvents } = useSendEvent();

  const plainFilters = reportingUnitSearchParametersView2Plain(filters);

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

  const executeSearch = () => {
    clearEvents('waste-search');
    if (Object.keys(removeEmpty(plainFilters)).length > 0) {
      setTimeout(refetch, 1);
    }
  };

  const handlePageChange = ({ page, pageSize }: { page: number; pageSize: number }) => {
    setCurrentPage(Math.min(Math.max(page, 0), (data?.page.totalPages ?? 1) - 1)); // Adjust for zero-based index
    setPageSize(pageSize);
    executeSearch();
  };

  const handleSort = (sortingKeys: Record<string, SortDirectionType>) => {
    setSort(sortingKeys);
    executeSearch();
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
        <WasteSearchFilters value={filters} onChange={setFilters} onSearch={executeSearch} />
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
