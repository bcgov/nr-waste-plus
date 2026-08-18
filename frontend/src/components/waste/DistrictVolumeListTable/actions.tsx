import { TableShortcut, TrashCan } from '@carbon/icons-react';
import { useNavigate } from '@tanstack/react-router';

import type { PageableResponse, TableRowAction } from '@/components/Form/TableResource/types';
import type { DistrictVolumeListItem } from '@/services/districtvolumes.types';

import { navigateInTree } from '@/routes/inTreePaths';
import { isFutureDated } from '@/utils/businessDate';

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
  const navigate = useNavigate();

  return (row: DistrictVolumeRow): TableRowAction<DistrictVolumeListItem>[] => {
    const actions: TableRowAction<DistrictVolumeListItem>[] = [
      {
        id: 'view-details',
        label: 'See details',
        icon: <TableShortcut />,
        onClick: (selectedRow) => {
          navigateInTree(navigate, `/configuration/district-volume-tables/${selectedRow.id}`);
        },
      },
    ];

    if (isFutureDated(row.startDate)) {
      actions.push({
        id: 'delete',
        label: (selectedRow) => `Delete district volume starting ${selectedRow.startDate}`,
        icon: <TrashCan />,
        onClick: (selectedRow) => {
          onDeleteClick(selectedRow);
        },
      });
    }

    return actions;
  };
};
