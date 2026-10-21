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
  // Primitives render as-is so falsy-but-meaningful values (0, false) do not
  // fall through to the dash fallback; everything else is JSON-serialized.
  if (typeof value === 'string' || typeof value === 'number') {
    return value;
  }
  return JSON.stringify(value);
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
