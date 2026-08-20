import { useListTableRowActions } from '../useListTableRowActions';

import type { DistrictVolumeListItem } from '@/services/districtvolumes.types';
import type { PageableResponse, TableRowAction } from '@/components/Form/TableResource/types';

type DistrictVolumeRow = PageableResponse<DistrictVolumeListItem>['content'][number];

/**
 * Row action hook for the district volume list table.
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
export const useDistrictVolumeListRowActions = (
  onDeleteClick: (row: DistrictVolumeRow) => void,
): ((row: DistrictVolumeRow) => TableRowAction<DistrictVolumeListItem>[]) => {
  return useListTableRowActions<DistrictVolumeRow>({
    configType: 'district volume',
    routePath: '/configuration/district-volume-tables/{id}',
    onDeleteClick,
    getStartDate: (row) => row.startDate,
    deleteActionLabel: 'district average volume entry',
  });
};
