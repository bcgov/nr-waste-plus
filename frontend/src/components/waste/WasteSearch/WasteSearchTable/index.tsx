import { Column } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { useState, type FC } from 'react';

import TableResource from '@/components/Form/TableResource';
import API from '@/services/APIs';
import { removeEmpty } from '@/services/utils';

import WasteSearchFilters from '../WasteSearchFilters';

import { headers } from './constants';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type {
  ReportingUnitSearchParametersDto,
  ReportingUnitSearchResultDto,
} from '@/services/search.types';

import './index.scss';

const WasteSearchTable: FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<ReportingUnitSearchParametersDto>(
    {} as ReportingUnitSearchParametersDto,
  );

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['search', 'ru', { page: currentPage, size: pageSize, ...filters }],
    queryFn: () => API.search.searchReportingUnit(filters, { page: currentPage, size: pageSize }),
    enabled: false,
    gcTime: 0,
    staleTime: 0,
  });

  const executeSearch = () => {
    if (Object.keys(removeEmpty(filters)).length > 0) {
      setTimeout(refetch, 1);
    }
  };

  const handlePageChange = ({ page, pageSize }: { page: number; pageSize: number }) => {
    setCurrentPage(Math.min(Math.max(page, 0), (data?.page.totalPages ?? 1) - 1)); // Adjust for zero-based index
    setPageSize(pageSize);
    executeSearch();
  };

  return (
    <>
      <Column lg={16} md={8} sm={4} className="search-filters">
        <WasteSearchFilters value={filters} onChange={setFilters} onSearch={executeSearch} />
      </Column>

      <Column lg={16} md={8} sm={4} className="search-table">
        <TableResource
          headers={headers}
          content={data ?? ({} as PageableResponse<ReportingUnitSearchResultDto>)}
          loading={isLoading}
          error={!isFetching && isError}
          onPageChange={handlePageChange}
          displayRange
        />
      </Column>
    </>
  );
};

export default WasteSearchTable;
