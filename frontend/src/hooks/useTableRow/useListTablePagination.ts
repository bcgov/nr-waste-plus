import { useState } from 'react';

import type { SortDirectionType } from '@/services/types';

/**
 * When a plain `boolean`, gates `executeSearch` directly.
 * When a function, receives the current filters and returns whether search should run.
 */
export type EnabledGate = boolean | ((filters: Record<string, unknown>) => boolean);

/**
 * Manages pagination, sorting, and search-trigger state for list tables.
 *
 * This is the pure state-management half of {@link useListTableState}.
 * Use it directly when the consumer needs to call their own query hook
 * at the top level (e.g. hooks with non-standard param shapes).
 *
 * @param filters - Optional filter values passed to the enabled gate.
 * @param enabled - Optional gate controlling whether `executeSearch` fires.
 * @returns Pagination state and handlers.
 */
export const useListTablePagination = ({
  filters,
  enabled,
}: {
  filters?: Record<string, unknown>;
  enabled?: EnabledGate;
} = {}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<Record<string, SortDirectionType>>({});
  const [searchTrigger, setSearchTrigger] = useState(0);

  const isSearchEnabled = (): boolean => {
    if (enabled === undefined || enabled === true) return true;
    if (enabled === false) return false;
    return enabled(filters ?? {});
  };

  const executeSearch = (page: number, size: number, { resetPage = false } = {}) => {
    if (!isSearchEnabled()) return;
    if (resetPage) {
      setCurrentPage(0);
    } else {
      setCurrentPage(page);
    }
    setPageSize(size);
    setSearchTrigger((n) => n + 1);
  };

  const handleSort = (sortingKeys: Record<string, SortDirectionType>) => {
    setSort(sortingKeys);
    executeSearch(currentPage, pageSize);
  };

  return {
    page: currentPage,
    size: pageSize,
    sort,
    searchTrigger,
    executeSearch,
    handleSort,
    isSearchEnabled,
  };
};
