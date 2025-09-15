import { Search } from '@carbon/icons-react';
import { Button, Column, Grid } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FC } from 'react';

import SearchInput from '@/components/Form/SearchInput';
import TableResource from '@/components/Form/TableResource';
import API from '@/services/APIs';

import { headers } from './constants';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { MyForestClientDto } from '@/services/types';

import './index.scss';

const MyClientListing: FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filter, setFilter] = useState<string>('');

  const { data, isLoading, isFetching, isError, refetch } = useQuery({
    queryKey: ['search', 'my-forest-client', { page: currentPage, size: pageSize, value: filter }],
    queryFn: () => API.forestclient.searchMyForestClients(filter, currentPage, pageSize),
    enabled: false,
    gcTime: 0,
    staleTime: Infinity,
  });

  const executeSearch = () => {
    setTimeout(refetch, 1);
  };

  const handlePageChange = ({ page, pageSize }: { page: number; pageSize: number }) => {
    setCurrentPage(Math.min(Math.max(page, 0), (data?.page.totalPages ?? 1) - 1)); // Adjust for zero-based index
    setPageSize(pageSize);
    executeSearch();
  };

  useEffect(() => {
    refetch();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <Column lg={16} md={8} sm={4} className="search-filters">
        <Grid className="table-filters-grid">
          <Column max={14} lg={14} md={6} sm={4} className="filters-column">
            <SearchInput
              id="main-search"
              label="Search"
              placeholder="Search by name"
              value={filter ?? ''}
              onChange={setFilter}
            />
          </Column>
          <Column max={2} lg={2} md={2} sm={0} className="filters-column">
            <Button
              id="search-button"
              data-testid="search-button-sm"
              className="search-button"
              renderIcon={Search}
              iconDescription="Search"
              type="button"
              size="md"
              onClick={executeSearch}
            >
              Search
            </Button>
          </Column>
          <Column className="search-col-sm" sm={4} md={0} lg={0} max={0}>
            <Button
              id="search-button"
              data-testid="search-button-sm"
              className="search-button"
              renderIcon={Search}
              iconDescription="Search"
              type="button"
              size="md"
              onClick={executeSearch}
            >
              Search
            </Button>
          </Column>
        </Grid>
      </Column>
      <Column lg={16} md={8} sm={4} className="search-table">
        <TableResource
          id="districts-search"
          headers={headers}
          content={data ?? ({} as PageableResponse<MyForestClientDto>)}
          loading={isLoading}
          error={!isFetching && isError}
          onPageChange={handlePageChange}
          displayRange
          displayToolbar
        />
      </Column>
    </>
  );
};

export default MyClientListing;
