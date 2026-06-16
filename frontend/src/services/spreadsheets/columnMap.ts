import { type ResolvedHeader } from './headerParser';

import { type ProcessorColumnHeader } from '@/components/Form/FileUploadInput/fileProcessor';

export interface ColumnRemapEntry {
  key: string;
  header?: string;
}

export type ColumnMap = Record<string, ColumnRemapEntry>;

export function toCodeFriendlyKey(naturalKey: string, index?: number): string {
  const cleaned = naturalKey
    .replace(/\r?\n/g, ' ')
    .replace(/[^a-zA-Z0-9\s\-/]/g, ' ')
    .trim();

  const words = cleaned.split(/[\s\-/]+/).filter(Boolean);

  const camel = words
    .map((word, i) =>
      i === 0
        ? word.charAt(0).toLowerCase() + word.slice(1)
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join('');

  return camel || (index !== undefined ? `column${index}` : 'column');
}

export function applyColumnMap(
  row: Record<string, unknown>,
  columnMap: ColumnMap,
): Record<string, unknown> {
  if (Object.keys(columnMap).length === 0) return row;
  const remapped: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    remapped[columnMap[key]?.key ?? key] = value;
  }
  return remapped;
}

export function buildProcessorHeaders(
  headers: ResolvedHeader[],
  columnMap: ColumnMap,
): ProcessorColumnHeader[] {
  return headers.map(({ path }) => {
    const remap = columnMap[path];
    const key = remap?.key ?? path;
    const header = remap?.header ?? path;
    return { key, header };
  });
}
