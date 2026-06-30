import { TableShortcut } from '@carbon/icons-react';
import { useNavigate } from '@tanstack/react-router';

import type { PageableResponse, TableRowAction } from '@/components/Form/TableResource/types';
import type { DistrictVolumeListItem } from '@/services/districtvolumes.types';

import { navigateInTree } from '@/routes/inTreePaths';

type DistrictVolumeRow = PageableResponse<DistrictVolumeListItem>['content'][number];

/**
 * Row action hook for the district volume list table.
 *
 * Returns a `getRowActions` callback that renders a single "See details" action.
 * When clicked, navigates to the district volume detail page for that row.
 *
 * @returns A function that takes a row and returns an array of row actions.
 */
export const useDistrictVolumeListRowActions = (): ((
  row: DistrictVolumeRow,
) => TableRowAction<DistrictVolumeListItem>[]) => {
  const navigate = useNavigate();

  return (_row: DistrictVolumeRow): TableRowAction<DistrictVolumeListItem>[] => [
    {
      id: 'view-details',
      label: 'See details',
      icon: <TableShortcut />,
      onClick: (selectedRow) => {
        navigateInTree(navigate, `/configuration/district-volume-tables/${selectedRow.id}`);
      },
    },
  ];
};
