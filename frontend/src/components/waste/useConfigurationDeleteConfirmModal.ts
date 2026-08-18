import { useCallback } from 'react';

import type { TableRowAction } from '@/components/Form/TableResource/types';

import ConfigurationDeleteConfirmModal from './ConfigurationDeleteConfirmModal';

interface UseConfigurationDeleteConfirmModalConfig<TItem> {
  rowToDelete: TItem | null;
  setRowToDelete: (row: TItem | null) => void;
  deleteMutation: any;
  configType: string;
  getStartDate: (item: TItem) => string;
  getId: (item: TItem) => string | number;
}

/**
 * Shared hook for delete confirmation modal logic.
 * Returns the getRowActions callback and the ConfigurationDeleteConfirmModal component.
 */
export const useConfigurationDeleteConfirmModal = <TItem>(
  config: UseConfigurationDeleteConfirmModalConfig<TItem>,
) => {
  const handleDeleteClick = useCallback(
    (item: TItem) => {
      config.deleteMutation.mutate(config.getId(item));
    },
    [config.deleteMutation, config.getId],
  );

  const getRowActions = useCallback(
    (row: TItem): TableRowAction<any>[] => {
      const actions: TableRowAction<any>[] = [
        {
          id: 'view-details',
          label: 'See details',
          // icon: <TableShortcut />, // icon is handled by the caller
          onClick: () => {
            // Navigation is handled by the caller
          },
        },
      ];

      // This is a placeholder - the actual actions are created by useListTableRowActions
      return actions;
    },
    [],
  );

  return {
    handleDeleteClick,
    DeleteConfirmModal: () => (
      <ConfigurationDeleteConfirmModal
        open={config.rowToDelete !== null}
        configurationType={config.configType}
        onClose={() => config.setRowToDelete(null)}
        onConfirm={() => {
          if (config.rowToDelete) {
            config.deleteMutation.mutate(config.getId(config.rowToDelete));
          }
        }}
      />
    ),
  };
};
