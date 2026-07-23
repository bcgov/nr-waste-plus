import { useEffect, useState } from 'react';

import type { SortDirectionType } from '@/services/types';

type PageableData = {
  page: { totalPages: number };
};

export type ListQueryHook<TData extends PageableData> = (
  params: { page: number; size: number; sort: Record<string, SortDirectionType> },
  options?: { enabled?: boolean; staleTime?: number },
) => {
  data: TData | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  refetch: () => void;
};

/**
 * Shared pagination, sorting, and search-trigger logic for list table components.
 *
 * @param queryHook - The react-query hook to call (e.g. `useSpeciesCompositionListQuery`)
 * @returns State and handlers to wire up a `TableResource`
 */
export const useListTableState = <TData extends PageableData>({
  queryHook,
}: {
  queryHook: ListQueryHook<TData>;
}) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [sort, setSort] = useState<Record<string, SortDirectionType>>({});
  const [searchTrigger, setSearchTrigger] = useState(0);

  const { data, isLoading, isFetching, isError, refetch } = queryHook(
    { page: currentPage, size: pageSize, sort },
    { enabled: false, staleTime: Infinity },
  );

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

  const handlePageChange = ({ page, pageSize }: { page: number; pageSize: number }) => {
    const maxPage = Math.max((data?.page.totalPages ?? 1) - 1, 0);
    const adjustedPage = Math.min(Math.max(page, 0), maxPage);
    executeSearch(adjustedPage, pageSize);
  };

  const handleSort = (sortingKeys: Record<string, SortDirectionType>) => {
    setSort(sortingKeys);
    executeSearch(currentPage, pageSize);
  };

  return { data, isLoading, isFetching, isError, handlePageChange, handleSort, pageSize };
};
