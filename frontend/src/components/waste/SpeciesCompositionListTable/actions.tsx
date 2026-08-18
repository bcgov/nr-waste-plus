import { useListTableRowActions } from '../useListTableRowActions';

import type { SpeciesCompositionListItem } from '@/services/speciesComposition.types';
import type { PageableResponse } from '@/components/Form/TableResource/types';

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
  return useListTableRowActions<SpeciesCompositionRow>({
    configType: 'species composition',
    routePath: '/configuration/species-composition/{id}',
    onDeleteClick,
    getStartDate: (row) => row.startDate,
  });
};
