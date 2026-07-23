import { Column } from '@carbon/react';

import { useListTableState } from '../useListTableState';

import { useSpeciesCompositionListRowActions } from './actions';
import { headers } from './constants';

import type { FC } from 'react';

import TableResource from '@/components/Form/TableResource';
import { useSpeciesCompositionListQuery } from '@/config/react-query/hooks';

import './index.scss';

/**
 * Paginated table of district level species composition configurations.
 *
 * Manages its own pagination, sorting, and data-fetching state, delegating
 * rendering to {@link TableResource}. The query is configured with
 * `enabled: false` so it never fetches automatically on state changes, and
 * `staleTime: Infinity` so a completed result is reused until an explicit
 * `refetch()` call (triggered on mount and on every pagination/sort change)
 * replaces it.
 *
 * @returns The species composition list table view.
 */
const SpeciesCompositionListTable: FC = () => {
  const getRowActions = useSpeciesCompositionListRowActions();

  const { data, isLoading, isFetching, isError, handlePageChange, handleSort, pageSize } =
    useListTableState({ queryHook: useSpeciesCompositionListQuery });

  return (
    <Column lg={16} md={8} sm={4} className="species-composition-column__content">
      <TableResource
        id="species-composition-list"
        headers={headers}
        content={
          data ?? {
            content: [],
            page: { number: 0, size: pageSize, totalElements: 0, totalPages: 0 },
          }
        }
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
