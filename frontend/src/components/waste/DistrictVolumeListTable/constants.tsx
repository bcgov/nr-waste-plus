import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { DistrictVolumeListItem } from '@/services/districtvolumes.types';

import DateTag from '@/components/core/Tags/DateTag';
import EmptyValueTag from '@/components/core/Tags/EmptyValueTag';

const areaDisplayMap: Record<string, string> = {
  INTERIOR: 'Interior',
  COASTAL: 'Coast',
};

export const headers: TableHeaderType<DistrictVolumeListItem>[] = [
  {
    key: 'area',
    header: 'Area',
    sortable: true,
    selected: true,
    renderAs: (value) => <span>{areaDisplayMap[value as string] ?? (value as string)}</span>,
  },
  {
    key: 'startDate',
    header: 'Start date',
    sortable: false,
    selected: true,
    renderAs: (value) => <DateTag date={value as string} format="MMMM dd, yyyy" />,
  },
  {
    key: 'endDate',
    header: 'End date',
    sortable: false,
    selected: true,
    renderAs: (value) => <EmptyValueTag value={value as string | number | null | undefined} />,
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
