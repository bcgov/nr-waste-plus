import { type NestedKeyOf, type ValueByPath } from '@/services/types';
import { getValueByPath } from '@/services/utils';

export type TableHeaderType<T, K extends NestedKeyOf<T> = NestedKeyOf<T>> = {
  key: K;
  header: string;
  selected?: boolean;
  sortable?: boolean;
  // Unique identifier for this column header. Used for React keys, tracking, and preferences.
  // If not provided, falls back to using the key. Use this when you need multiple columns
  // with the same data property (key) but different renderings.
  id?: string;
  // renderAs function should expect as argument the value of the key in T
  // and return a React node to be rendered in the table cell
  // This is useful for custom rendering, like in the StatusTag component
  // where it receives a value of type { code: string; name: string }
  // Example: renderAs: (value) => <StatusTag value={value} />
  // If not provided, the default rendering will be used (value.toString())
  renderAs?: (value: ValueByPath<T, K>) => React.ReactNode;
};

export type PaginationOnChangeType = {
  page: number;
  pageSize: number;
  ref?: React.RefObject<unknown>;
};

export type IdentifiableContent<T> = { id: string | number } & T;

export type PageType = {
  size: number;
  number: number;
  totalElements: number;
  totalPages: number;
};

export type PageableResponse<T> = {
  content: IdentifiableContent<T>[];
  page: PageType;
};

/**
 * Get the effective unique identifier for a header.
 * Returns the id if provided, otherwise returns the key as string.
 */
export function getHeaderId<T>(header: TableHeaderType<T>): string {
  return header.id ?? String(header.key);
}

export function renderCell<T>(row: T, header: TableHeaderType<T, NestedKeyOf<T>>): React.ReactNode {
  const value = getValueByPath(row, header.key);
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
