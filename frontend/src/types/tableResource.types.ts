import type { NestedKeyOf, PageType, ValueByPath } from './pagination.types';
import type { ReactNode } from 'react';

type TableRowActionValue<T, R> = R | ((row: IdentifiableContent<T>) => R);

export type TableHeaderType<T, K extends NestedKeyOf<T> = NestedKeyOf<T>> = {
  key: K;
  header: string;
  selected?: boolean;
  sortable?: boolean;
  // Unique identifier for this column header. Used for React keys, tracking, and preferences.
  // If not provided, falls back to using the key. Use this when you need multiple columns
  // with the same data property (key) but different renderings.
  id?: string;
  // Tooltip text displayed on hover over the column header.
  // Useful for providing descriptions or additional context for abbreviated headers.
  headerTooltip?: string;
  // renderAs function should expect as argument the value of the key in T
  // and return a React node for the table cell
  // This is useful for custom rendering, like in the StatusTag component
  // where it receives a value of type { code: string; name: string }
  // Example: renderAs: (value) => <StatusTag value={value} />
  // If not provided, the default rendering will be used (value.toString())
  renderAs?: (value: ValueByPath<T, K>) => ReactNode;
};

export type PaginationOnChangeType = {
  page: number;
  pageSize: number;
  ref?: React.RefObject<unknown>;
};

export type IdentifiableContent<T> = { id: string | number } & T;

export type TableRowAction<T> = {
  id: string;
  label: TableRowActionValue<T, string>;
  icon: TableRowActionValue<T, React.ReactNode>;
  onClick: (row: IdentifiableContent<T>) => void | Promise<void>;
  isDisabled?: TableRowActionValue<T, boolean>;
  isLoading?: TableRowActionValue<T, boolean>;
};

export type TableResourceActionsProps<T> = {
  row: IdentifiableContent<T>;
  actions: TableRowAction<T>[];
  maxInlineRowActions: number;
};

/**
 * App-facing page envelope. Rows must carry a stable `id` (the backend
 * composes one for search rows; list endpoints derive it at the query
 * boundary) so the table layer can address rows uniformly.
 */
export type PageableResponse<T> = {
  content: IdentifiableContent<T>[];
  page: PageType;
};
