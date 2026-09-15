import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { FormulaSetResponse } from '@/services/formulaConfiguration.types';

import DateTag from '@/components/core/Tags/DateTag';

const areaDisplayMap: Record<string, string> = {
  INTERIOR: 'Interior',
  COASTAL: 'Coastal',
};

/**
 * Table headers for the formula configuration list table.
 * Area and start date are sortable.
 */
export const headers: TableHeaderType<FormulaSetResponse>[] = [
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
    key: 'formulas',
    header: 'Formulas',
    sortable: false,
    selected: true,
    renderAs: (value) => {
      const count = Array.isArray(value) ? value.length : 0;
      return <span>{count}</span>;
    },
  },
  {
    key: 'createdAt',
    header: 'Created',
    sortable: false,
    selected: false,
    renderAs: (value) => <DateTag date={value as string} format="MMM dd, yyyy h:mm a" />,
  },
  {
    key: 'updatedAt',
    header: 'Updated',
    sortable: false,
    selected: false,
    renderAs: (value) => <DateTag date={value as string} format="MMM dd, yyyy h:mm a" />,
  },
];
