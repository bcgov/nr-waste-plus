import { useState } from 'react';

import { sendToastEvent } from '@/hooks/useNotificationEvents/eventHandler';
import { useListTableState } from '../useListTableState';
import { useConfigurationDeleteConfirmModal } from './useConfigurationDeleteConfirmModal';

import type { PageableResponse } from '@/components/Form/TableResource/types';
import type { FC } from 'react';

interface UseConfigurationListTableConfig<TItem> {
  /** The configuration type for display (e.g., "district volume", "species composition") */
  configType: string;
  /** The table ID */
  tableId: string;
  /** Column CSS class */
  columnClassName: string;
  /** React Query list query hook */
  queryHook: () => any;
  /** React Query delete mutation hook */
  deleteMutationHook: (config: { notificationTarget: string; onSuccess: () => void }) => any;
  /** Headers for the table */
  headers: any[];
  /** Function to get the start date from an item */
  getStartDate: (item: TItem) => string;
  /** Function to get the ID from an item */
  getId: (item: TItem) => string | number;
}

/**
 * Shared hook for configuration list tables (district volume, species composition).
 * Eliminates duplication between DistrictVolumeListTable and SpeciesCompositionListTable.
 */
export const useConfigurationListTable = <TItem>(config: UseConfigurationListTableConfig<TItem>) => {
  const [rowToDelete, setRowToDelete] = useState<TItem | null>(null);

  const { data, isLoading, isFetching, isError, refetch, handlePageChange, handleSort, pageSize } =
    useListTableState({ queryHook: config.queryHook });

  const deleteMutation = config.deleteMutationHook({
    notificationTarget: config.tableId,
    onSuccess: () => {
      setRowToDelete(null);
      refetch();
      sendToastEvent({
        title: `${capitalizeFirst(config.configType)} deleted`,
        description: `The ${config.configType} configuration was deleted.`,
        eventType: 'success',
      }),
    },
  });

  const getRowActions = useConfigurationDeleteConfirmModal<TItem>({
    rowToDelete,
    setRowToDelete,
    deleteMutation,
    configType: config.configType,
    getStartDate: config.getStartDate,
    getId: config.getId,
  });

  const content = data ?? {
    content: [],
    page: { number: 0, size: pageSize, totalElements: 0, totalPages: 0 },
  };

  return {
    content,
    isLoading,
    isFetching,
    isError,
    handlePageChange,
    handleSort,
    getRowActions,
    rowToDelete,
    setRowToDelete,
    deleteMutation,
    refetch,
  };
};

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
