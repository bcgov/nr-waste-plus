import { Column } from '@carbon/react';
import { useEffect, useState, type FC } from 'react';

import { useSpeciesCompositionListRowActions } from './actions';
import { headers } from './constants';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { SpeciesCompositionListItem } from '@/services/speciesComposition.types';
import type { SortDirectionType } from '@/services/types';

import TableResource from '@/components/Form/TableResource';
import { useSpeciesCompositionListQuery } from '@/config/react-query/hooks';

import './index.scss';

/**
 * Paginated table of district level species composition configurations.
 *
 * Manages its own pagination, sorting, and data-fetching state, delegating
 * rendering to {@link TableResource}. The query is configured with
 * `enabled: false` and `staleTime: Infinity` so every search is explicit
 * and results are never served from cache.
 *
 * @returns The species composition list table view.
 */
const SpeciesCompositionListTable: FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<Record<string, SortDirectionType>>({});
  const [searchTrigger, setSearchTrigger] = useState(0);

  const getRowActions = useSpeciesCompositionListRowActions();

  const { data, isLoading, isFetching, isError, refetch } = useSpeciesCompositionListQuery(
    { page: currentPage, size: pageSize, sort },
    { enabled: false, staleTime: Infinity },
  );

  /**
   * Triggers a fetch with the given pagination state.
   */
  const executeSearch = (page: number, size: number) => {
    setCurrentPage(page);
    setPageSize(size);
    setSearchTrigger((n) => n + 1);
  };

  useEffect(() => {
    if (searchTrigger > 0) {
      refetch();
    }
  }, [searchTrigger, refetch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /**
   * Applies a table page change and fetches the corresponding result set.
   */
  const handlePageChange = ({ page, pageSize }: { page: number; pageSize: number }) => {
    const adjustedPage = Math.min(Math.max(page, 0), (data?.page.totalPages ?? 1) - 1);
    executeSearch(adjustedPage, pageSize);
  };

  /**
   * Applies updated sort keys and reruns the current search.
   */
  const handleSort = (sortingKeys: Record<string, SortDirectionType>) => {
    setSort(sortingKeys);
    executeSearch(currentPage, pageSize);
  };

  return (
    <Column lg={16} md={8} sm={4} className="species-composition-column__content">
      <TableResource
        id="species-composition-list"
        headers={headers}
        content={data ?? ({} as PageableResponse<SpeciesCompositionListItem>)}
        loading={isLoading}
        error={!isFetching && isError}
        onPageChange={handlePageChange}
        onSortChange={handleSort}
        displayRange
        displayToolbar
        getRowActions={getRowActions}
      />
    </Column>
  );
};

export default SpeciesCompositionListTable;
