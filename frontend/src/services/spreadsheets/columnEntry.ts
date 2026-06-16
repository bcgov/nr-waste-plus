import type { ColumnMap } from './columnMap';

export function col(rawHeader: string, key: string, header?: string): ColumnMap {
  return { [rawHeader]: { key, header: header ?? key } };
}
