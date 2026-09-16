import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { FormulaSetListItemDto } from '@/services/formulaConfiguration.types';

import DateTag from '@/components/core/Tags/DateTag';

const areaDisplayMap: Record<string, string> = {
  INTERIOR: 'Interior',
  COASTAL: 'Coastal',
};

/**
 * Table headers for the formula configuration list table.
 * Area and start date are sortable.
 */
export const headers: TableHeaderType<FormulaSetListItemDto>[] = [
  {
    key: 'area',
    header: 'Area',
    sortable: true,
    selected: true,
    renderAs: (value) => <>{areaDisplayMap[value as string] ?? (value as string)}</>,
  },
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
    renderAs: (value) =>
      value ? <DateTag date={value as string} format="MMMM dd, yyyy" /> : <span>—</span>,
  },
  {
    key: 'formulaCount',
    header: 'Formulas',
    sortable: false,
    selected: true,
    renderAs: (value) => <span>{(value as number) ?? 0}</span>,
  },
  {
    key: 'createdAt',
    header: 'Created',
    sortable: false,
    selected: false,
    renderAs: (value) =>
      value ? <DateTag date={value as string} format="MMM dd, yyyy h:mm a" /> : null,
  },
  {
    key: 'updatedAt',
    header: 'Updated',
    sortable: false,
    selected: false,
    renderAs: (value) =>
      value ? <DateTag date={value as string} format="MMM dd, yyyy h:mm a" /> : null,
  },
];
