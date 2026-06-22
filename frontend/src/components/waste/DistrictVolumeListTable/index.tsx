import { Column } from '@carbon/react';
import { useEffect, useState, type FC } from 'react';

import { headers } from './constants';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { DistrictVolumeListItem } from '@/services/districtvolumes.types';
import type { SortDirectionType } from '@/services/types';

import TableResource from '@/components/Form/TableResource';
import { useDistrictVolumeListQuery } from '@/config/react-query/hooks';

import './index.scss';

/**
 * Paginated table of district average waste volume configurations.
 *
 * Manages its own pagination, sorting, and data-fetching state, delegating
 * rendering to {@link TableResource}. The query is configured with
 * `enabled: false` and `staleTime: Infinity` so every search is explicit
 * and results are never served from cache.
 *
 * @returns The district volume list table view.
 */
const DistrictVolumeListTable: FC = () => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<Record<string, SortDirectionType>>({});
  const [searchTrigger, setSearchTrigger] = useState(0);

  const { data, isLoading, isFetching, isError, refetch } = useDistrictVolumeListQuery(
    { page: currentPage, size: pageSize, sort },
    { enabled: false, staleTime: Infinity },
  );

  /**
   * Triggers a fetch with the current pagination and sort state.
   */
  const executeSearch = (page?: number, size?: number) => {
    setCurrentPage(page ?? currentPage);
    setPageSize(size ?? pageSize);
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
    <Column lg={16} md={8} sm={4} className="configuration-column__content">
      <TableResource
        id="district-volume-list"
        headers={headers}
        content={data ?? ({} as PageableResponse<DistrictVolumeListItem>)}
        loading={isLoading}
        error={!isFetching && isError}
        onPageChange={handlePageChange}
        onSortChange={handleSort}
        displayRange
        displayToolbar
      />
    </Column>
  );
};

export default DistrictVolumeListTable;
