import { TableShortcut } from '@carbon/icons-react';
import { useNavigate } from '@tanstack/react-router';

import type { PageableResponse, TableRowAction } from '@/components/Form/TableResource/types';
import type { SpeciesCompositionListItem } from '@/services/speciesComposition.types';

import { navigateInTree } from '@/routes/inTreePaths';

type SpeciesCompositionRow = PageableResponse<SpeciesCompositionListItem>['content'][number];

/**
 * Row action hook for the species composition list table.
 *
 * Returns a `getRowActions` callback that renders a single "See details" action.
 * When clicked, navigates to the species composition detail page for that row.
 *
 * @returns A function that takes a row and returns an array of row actions.
 */
export const useSpeciesCompositionListRowActions = (): ((
  row: SpeciesCompositionRow,
) => TableRowAction<SpeciesCompositionListItem>[]) => {
  const navigate = useNavigate();

  return (_row: SpeciesCompositionRow): TableRowAction<SpeciesCompositionListItem>[] => [
    {
      id: 'view-details',
      label: 'See details',
      icon: <TableShortcut />,
      onClick: (selectedRow) => {
        navigateInTree(navigate, `/configuration/species-composition/${selectedRow.id}`);
      },
    },
  ];
};
