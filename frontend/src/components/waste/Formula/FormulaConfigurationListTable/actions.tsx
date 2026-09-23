import type { PageableResponse, TableRowAction } from '@/components/Form/TableResource/types.ts';
import type { FormulaSetResponse } from '@/services/formulaConfiguration.types.ts';

import { useListTableRowActions } from '@/hooks/useTableRow';

type FormulaSetRow = PageableResponse<FormulaSetResponse>['content'][number];

/**
 * Row action hook for the formula configuration list table.
 *
 * Returns a `getRowActions` callback that renders a "See details" action for
 * every row plus a "Delete" action for rows whose start date is in the future
 * (client-side usability guard; the backend enforces the same rule).
 * When delete is picked, the row is handed to `onDeleteClick` so the table can
 * open its confirmation modal.
 *
 * @param onDeleteClick Callback invoked when the user picks delete.
 * @returns A function that takes a row and returns an array of row actions.
 */
export const useFormulaConfigurationListRowActions = (
  onDeleteClick: (row: FormulaSetRow) => void,
): ((row: FormulaSetRow) => TableRowAction<FormulaSetResponse>[]) => {
  return useListTableRowActions<FormulaSetRow>({
    configType: 'formula configuration',
    routePath: '/configuration/formulas/{id}',
    onDeleteClick,
    getStartDate: (row) => row.startDate,
    deleteActionLabel: 'formula configuration entry',
    canDelete: (row) => !row.deleted,
  });
};
