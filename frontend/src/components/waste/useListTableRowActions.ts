import { TableShortcut, TrashCan } from '@carbon/icons-react';
import { useNavigate } from '@tanstack/react-router';

import type { PageableResponse, TableRowAction } from '@/components/Form/TableResource/types';
import { navigateInTree } from '@/routes/inTreePaths';
import { isFutureDated } from '@/utils/businessDate';
import { useCallback } from 'react';

interface UseListTableRowActionsConfig<TRow> {
  /** The configuration type for display (e.g., "district volume", "species composition") */
  configType: string;
  /** The route path template (e.g., "/configuration/district-volume-tables/{id}") */
  routePath: string;
  /** Callback invoked when user clicks delete */
  onDeleteClick: (row: TRow) => void;
  /** Function to get the start date from a row for the delete label */
  getStartDate: (row: TRow) => string;
}

/**
 * Shared hook for list table row actions (view details, delete).
 * Eliminates duplication between DistrictVolumeListTable and SpeciesCompositionListTable.
 */
export const useListTableRowActions = <TRow extends { id: string | number }>(
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
            navigateInTree(navigate, config.routePath.replace('{id}', String(selectedRow.id)));
          },
        },
      ];

      if (isFutureDated(config.getStartDate(row))) {
        actions.push({
          id: 'delete',
          label: (selectedRow) =>
            `Delete ${config.configType} starting ${config.getStartDate(selectedRow)}`,
          icon: <TrashCan />,
          onClick: (selectedRow) => {
            config.onDeleteClick(selectedRow);
          },
        });
      }

      return actions;
    },
    [config.configType, config.routePath, config.onDeleteClick, config.getStartDate, navigate],
  );
};
