import { useEffect } from 'react';

import { useListTablePagination } from './useListTablePagination';

import type { EnabledGate } from './useListTablePagination';

type PageableData = {
  page: { totalPages: number };
};

type QueryResult<TData> = {
  data: TData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * Shared pagination, sorting, and search-trigger logic for list table components
 * that use a standard query hook accepting `{ page, size, sort }`.
 *
 * Composes {@link useListTablePagination} with a query hook and wires the
 * refetch effects. For consumers whose query hook has a non-standard signature
 * (e.g. extra `filters` parameter), use `useListTablePagination` directly and
 * call the query hook at the top level.
 *
 * @param queryHook - A function that accepts internal page/sort state and returns a react-query result.
 * @param filters - Optional filter values passed to the enabled gate.
 * @param enabled - Optional gate controlling whether `executeSearch` fires.
 * @returns State and handlers to wire up a `TableResource`.
 */
export const useListTableState = <TData extends PageableData>({
  queryHook,
  filters,
  enabled,
}: {
  queryHook: (params: {
    page: number;
    size: number;
    sort: Record<string, import('@/services/types').SortDirectionType>;
  }) => QueryResult<TData>;
  filters?: Record<string, unknown>;
  enabled?: EnabledGate;
}) => {
  const { page, size, sort, searchTrigger, executeSearch, handleSort, isSearchEnabled } =
    useListTablePagination({ filters, enabled });

  const { data, isLoading, isFetching, isError, refetch } = queryHook({ page, size, sort });

  useEffect(() => {
    if (searchTrigger > 0) {
      refetch();
    }
  }, [searchTrigger, refetch]);

  useEffect(() => {
    if (isSearchEnabled()) {
      refetch();
    }
    // Mount-only: initial data loading for list tables.
    // WasteSearchTable skips this because enabled is false when filters are empty.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetch]);

  const handlePageChange = ({ page, pageSize }: { page: number; pageSize: number }) => {
    const maxPage = Math.max((data?.page.totalPages ?? 1) - 1, 0);
    const adjustedPage = Math.min(Math.max(page, 0), maxPage);
    executeSearch(adjustedPage, pageSize);
  };

  return {
    data,
    isLoading,
    isFetching,
    isError,
    refetch,
    handlePageChange,
    handleSort,
    pageSize: size,
  };
};
