import { Search } from '@carbon/icons-react';
import { Button, Column, Grid } from '@carbon/react';
import { useEffect, useState, type FC } from 'react';

import { headers } from './constants';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { MyForestClientDto } from '@/services/types';

import SearchInput from '@/components/Form/SearchInput';
import TableResource from '@/components/Form/TableResource';
import { useMyForestClientsQuery } from '@/config/react-query/hooks';
import useNotificationEvents from '@/hooks/useNotificationEvents';

import './index.scss';

/**
 * Client listing page for the authenticated user's forest clients.
 *
 * Combines a {@link SearchInput} with a paginated {@link TableResource} to let
 * users search and browse the clients they are associated with. Key behaviours:
 *
 * - The query is configured with `enabled: false` and `gcTime: 0` so results
 *   are never served from cache; every search fetches fresh data.
 * - Searches are triggered by an explicit `searchTrigger` counter incremented by
 *   {@link executeSearch} rather than by implicit state changes, providing
 *   predictable fetch timing after React's synchronous state flush.
 * - Inline error notifications are dispatched via {@link useNotificationEvents}
 *   to the `my-client-list` notification target before each new search.
 * - Client codes in the results table are rendered as TanStack Router links to
 *   `/search?clientNumbers={code}`.
 *
 * @returns The client listing view column.
 */
const MyClientListing: FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [filter, setFilter] = useState<string>('');
  const [searchTrigger, setSearchTrigger] = useState(0);
  const { clearEvents } = useNotificationEvents();

  const forestClientsQuery = useMyForestClientsQuery(filter, currentPage, pageSize, {
    enabled: false,
    gcTime: 0,
    notificationTarget: 'my-client-list',
    staleTime: Infinity,
    select: (data) =>
      ({
        ...data,
        content: data.content.map((item) => ({
          ...item,
          id: item.client.code,
        })),
      }) as PageableResponse<MyForestClientDto>,
  });

  const { data, isLoading, isFetching, isError, refetch } = forestClientsQuery;

  /**
   * Runs the current client search and clears page-scoped events first.
   */
  const executeSearch = () => {
    clearEvents('my-client-list');
    // Increment trigger to signal that state has settled and we should fetch.
    // This explicit pattern avoids the implicit timing contract of setTimeout,
    // ensuring the effect fires after React's synchronous state flush completes.
    setSearchTrigger((n) => n + 1);
  };

  /**
   * Applies a page change and fetches the corresponding client results.
   *
   * @param paging The requested page and page size.
   */
  const handlePageChange = ({ page, pageSize }: { page: number; pageSize: number }) => {
    setCurrentPage(Math.min(Math.max(page, 0), (data?.page.totalPages ?? 1) - 1)); // Adjust for zero-based index
    setPageSize(pageSize);
    executeSearch();
  };

  useEffect(() => {
    if (searchTrigger > 0) {
      refetch();
    }
  }, [searchTrigger, refetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

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
              onSearch={executeSearch}
            />
          </Column>
          <Column max={2} lg={2} md={2} sm={0} className="filters-column">
            <Button
              id="search-button"
              data-testid="search-button-other"
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
