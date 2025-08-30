export type NestedKeyOf<T> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
    : `${K}`;
}[keyof T & (string | number)];

export type ValueByPath<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? ValueByPath<T[K], Rest>
    : never
  : P extends keyof T
    ? T[P]
    : never;

export const getValueByPath = <T, P extends NestedKeyOf<T>>(obj: T, path: P): ValueByPath<T, P> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return path.split('.').reduce((acc, key) => acc && acc[key], obj as any) as ValueByPath<T, P>;
};

export type TableHeaderType<T, K extends NestedKeyOf<T> = NestedKeyOf<T>> = {
  key: K;
  header: string;
  selected?: boolean;
  sortable?: boolean;
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

export type SortDirectionType = 'ASC' | 'DESC' | 'NONE';

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
