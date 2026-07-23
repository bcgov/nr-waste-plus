import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { SpeciesCompositionListItem } from '@/services/speciesComposition.types';

import DateTag from '@/components/core/Tags/DateTag';

export const headers: TableHeaderType<SpeciesCompositionListItem>[] = [
  {
    key: 'startDate',
    header: 'Start date',
    sortable: true,
    selected: true,
    renderAs: (value) => <DateTag date={value as string} format="MMMM dd, yyyy" />,
  },
  {
    key: 'endDate',
    header: 'End date',
    sortable: false,
    selected: true,
    renderAs: (value) => (value ? <DateTag date={value as string} format="MMMM dd, yyyy" /> : '-'),
  },
  {
    key: 'uploadedBy',
    header: 'Uploaded by',
    sortable: false,
    selected: true,
  },
  {
    key: 'dateOfUpload',
    header: 'Date of upload',
    sortable: false,
    selected: true,
    renderAs: (value) => <DateTag date={value as string} format="MMM dd, yyyy" />,
  },
];
