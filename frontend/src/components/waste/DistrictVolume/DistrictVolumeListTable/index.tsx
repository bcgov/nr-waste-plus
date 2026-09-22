import { Column } from '@carbon/react';
import { useState } from 'react';

import { useListTableState } from '../useListTableState';

import { useDistrictVolumeListRowActions } from './actions';
import { headers } from './constants';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { DistrictVolumeListItem } from '@/services/districtvolumes.types';
import type { FC } from 'react';

import TableResource from '@/components/Form/TableResource';
import ConfigurationDeleteConfirmModal from '@/components/waste/ConfigurationDeleteConfirmModal';
import {
  useDistrictVolumeListQuery,
  useDistrictVolumeTableDeleteMutation,
} from '@/config/react-query/hooks';
import { sendToastEvent } from '@/hooks/useNotificationEvents/eventHandler';

import './index.scss';

/**
 * Paginated table of district average waste volume configurations.
 *
 * Manages its own pagination, sorting, and data-fetching state, delegating
 * rendering to {@link TableResource}. The query is configured with
 * `enabled: false` and `staleTime: Infinity` so every search is explicit
 * and results are never served from cache. Future-dated rows expose a delete
 * action that opens a confirmation modal; a successful deletion refreshes the
 * list and notifies the user.
 *
 * @returns The district volume list table view.
 */
const DistrictVolumeListTable: FC = () => {
  const [rowToDelete, setRowToDelete] = useState<DistrictVolumeListItem | null>(null);

  const { data, isLoading, isFetching, isError, refetch, handlePageChange, handleSort } =
    useListTableState({ queryHook: useDistrictVolumeListQuery });

  const deleteMutation = useDistrictVolumeTableDeleteMutation({
    notificationTarget: 'district-volume-list',
    onSuccess: () => {
      setRowToDelete(null);
      refetch();
      sendToastEvent({
        title: 'District volume deleted',
        description: 'The district volume configuration was deleted.',
        eventType: 'success',
      });
    },
  });

  const getRowActions = useDistrictVolumeListRowActions(setRowToDelete);

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
        getRowActions={getRowActions}
      />
      <ConfigurationDeleteConfirmModal
        open={rowToDelete !== null}
        configurationType="district volume"
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

export default DistrictVolumeListTable;
