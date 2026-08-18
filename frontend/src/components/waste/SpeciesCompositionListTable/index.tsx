import { Column } from '@carbon/react';
import { useState } from 'react';

import { useListTableState } from '../useListTableState';

import { useSpeciesCompositionListRowActions } from './actions';
import { headers } from './constants';

import type { SpeciesCompositionListItem } from '@/services/speciesComposition.types';
import type { FC } from 'react';

import TableResource from '@/components/Form/TableResource';
import ConfigurationDeleteConfirmModal from '@/components/waste/ConfigurationDeleteConfirmModal';
import {
  useSpeciesCompositionDeleteMutation,
  useSpeciesCompositionListQuery,
} from '@/config/react-query/hooks';
import { sendToastEvent } from '@/hooks/useNotificationEvents/eventHandler';

import './index.scss';

/**
 * Paginated table of district level species composition configurations.
 *
 * Manages its own pagination, sorting, and data-fetching state, delegating
 * rendering to {@link TableResource}. The query is configured with
 * `enabled: false` so it never fetches automatically on state changes, and
 * `staleTime: Infinity` so a completed result is reused until an explicit
 * `refetch()` call (triggered on mount and on every pagination/sort change)
 * replaces it. Future-dated rows expose a delete action that opens a
 * confirmation modal; a successful deletion refreshes the list and notifies
 * the user.
 *
 * @returns The species composition list table view.
 */
const SpeciesCompositionListTable: FC = () => {
  const [rowToDelete, setRowToDelete] = useState<SpeciesCompositionListItem | null>(null);

  const { data, isLoading, isFetching, isError, refetch, handlePageChange, handleSort, pageSize } =
    useListTableState({ queryHook: useSpeciesCompositionListQuery });

  const deleteMutation = useSpeciesCompositionDeleteMutation({
    notificationTarget: 'species-composition-list',
    onSuccess: () => {
      setRowToDelete(null);
      refetch();
      sendToastEvent({
        title: 'Species composition deleted',
        description: 'The species composition configuration was deleted.',
        eventType: 'success',
      });
    },
  });

  const getRowActions = useSpeciesCompositionListRowActions(setRowToDelete);

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
      <ConfigurationDeleteConfirmModal
        open={rowToDelete !== null}
        configurationType="species composition"
        startDate={rowToDelete?.startDate ?? ''}
        isDeleting={deleteMutation.isPending}
        onConfirm={() => {
          if (rowToDelete) {
            deleteMutation.mutate(rowToDelete.id);
          }
        }}
        onClose={() => setRowToDelete(null)}
      />
    </Column>
  );
};

export default SpeciesCompositionListTable;
