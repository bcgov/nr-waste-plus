import { TableShortcut, TrashCan } from '@carbon/icons-react';
import { useNavigate } from '@tanstack/react-router';
import { useCallback } from 'react';

import type { PageableResponse, TableRowAction } from '@/components/Form/TableResource/types';

import { navigateInTree, type InTreePath } from '@/routes/inTreePaths';
import { isFutureDated } from '@/utils/businessDate';

interface UseListTableRowActionsConfig<TRow> {
  /** The configuration type for display (e.g., "district volume", "species composition") */
  configType: string;
  /** The route path template (e.g., "/configuration/district-volume-tables/{id}") */
  routePath: string;
  /** Callback invoked when user clicks delete */
  onDeleteClick: (row: TRow) => void;
  /** Function to get the start date from a row for the delete guard */
  getStartDate: (row: TRow) => string;
  /** Custom label for the delete action (e.g., "district average volume entry") */
  deleteActionLabel: string;
  /** Optional additional guard for resources with lifecycle-specific delete rules. */
  canDelete?: (row: TRow) => boolean;
}

/**
 * Shared hook for list table row actions (view details, delete).
 * Eliminates duplication between DistrictVolumeListTable and SpeciesCompositionListTable.
 */
export const useListTableRowActions = <
  TRow extends { id: string | number; endDate?: string | null },
>(
  config: UseListTableRowActionsConfig<TRow>,
) => {
  const navigate = useNavigate();

  return useCallback(
    (row: TRow): TableRowAction<PageableResponse<TRow>['content'][number]>[] => {
      const actions: TableRowAction<PageableResponse<TRow>['content'][number]>[] = [
        {
          id: 'view-details',
          label: 'See details',
          icon: <TableShortcut />,
          onClick: (selectedRow) => {
            const path = config.routePath.replace('{id}', String(selectedRow.id));
            navigateInTree(navigate, path as InTreePath);
          },
        },
      ];

      if (
        isFutureDated(config.getStartDate(row)) &&
        !row.endDate &&
        (config.canDelete?.(row) ?? true)
      ) {
        actions.push({
          id: 'delete',
          label: `Delete ${config.deleteActionLabel}`,
          icon: <TrashCan />,
          onClick: (selectedRow) => {
            config.onDeleteClick(selectedRow);
          },
        });
      }

      return actions;
    },
    [config, navigate],
  );
};
