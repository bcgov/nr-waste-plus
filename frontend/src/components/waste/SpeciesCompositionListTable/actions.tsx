import { TableShortcut, TrashCan } from '@carbon/icons-react';
import { useNavigate } from '@tanstack/react-router';

import type { PageableResponse, TableRowAction } from '@/components/Form/TableResource/types';
import type { SpeciesCompositionListItem } from '@/services/speciesComposition.types';

import { navigateInTree } from '@/routes/inTreePaths';
import { isFutureDated } from '@/utils/businessDate';

type SpeciesCompositionRow = PageableResponse<SpeciesCompositionListItem>['content'][number];

/**
 * Row action hook for the species composition list table.
 *
 * Returns a `getRowActions` callback that renders a "See details" action for
 * every row plus a "Delete" action for rows whose effective start date is in
 * the future (client-side usability guard; the backend enforces the same rule).
 * When delete is picked, the row is handed to `onDeleteClick` so the table can
 * open its confirmation modal.
 *
 * @param onDeleteClick Callback invoked with the row when the user picks delete.
 * @returns A function that takes a row and returns an array of row actions.
 */
export const useSpeciesCompositionListRowActions = (
  onDeleteClick: (row: SpeciesCompositionRow) => void,
): ((row: SpeciesCompositionRow) => TableRowAction<SpeciesCompositionListItem>[]) => {
  const navigate = useNavigate();

  return (row: SpeciesCompositionRow): TableRowAction<SpeciesCompositionListItem>[] => {
    const actions: TableRowAction<SpeciesCompositionListItem>[] = [
      {
        id: 'view-details',
        label: 'See details',
        icon: <TableShortcut />,
        onClick: (selectedRow) => {
          navigateInTree(navigate, `/configuration/species-composition/${selectedRow.id}`);
        },
      },
    ];

    if (isFutureDated(row.startDate)) {
      actions.push({
        id: 'delete',
        label: (selectedRow) => `Delete species composition starting ${selectedRow.startDate}`,
        icon: <TrashCan />,
        onClick: (selectedRow) => {
          onDeleteClick(selectedRow);
        },
      });
    }

    return actions;
  };
};
