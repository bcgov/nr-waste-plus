import { getValueByPath } from '@/services/utils';

import type { NestedKeyOf } from '@/types/pagination.types';
import type { IdentifiableContent, TableHeaderType } from '@/types/tableResource.types';
import type { ReactNode } from 'react';

/**
 * Get the effective unique identifier for a header.
 * Returns the id if provided, otherwise returns the key as string.
 */
export function getHeaderId<T>(header: TableHeaderType<T>): string {
  return header.id ?? String(header.key);
}

export function renderCell<T>(row: T, header: TableHeaderType<T, NestedKeyOf<T>>): ReactNode {
  const value = getValueByPath(row, header.key);
  if (value == null) {
    return '-';
  }
  if (header.renderAs) {
    return header.renderAs(value);
  }
  if (value) {
    const displayValue =
      typeof value === 'string' || typeof value === 'number'
        ? value
        : value == null
          ? undefined
          : JSON.stringify(value);
    return displayValue;
  } else {
    return '-';
  }
}

export function resolveTableRowActionValue<T, R>(
  value: ((row: IdentifiableContent<T>) => R) | R,
  row: IdentifiableContent<T>,
): R {
  if (typeof value === 'function') {
    return (value as (row: IdentifiableContent<T>) => R)(row);
  }
  return value;
}
