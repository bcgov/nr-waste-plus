import { type MergeRange } from '@/services/excelReader/excelReader';

export interface ColumnSegments {
  readonly index: number;
  readonly segments: string[];
}

export interface ResolvedHeader {
  readonly index: number;
  readonly path: string;
  readonly keys: string[];
  readonly sourceColumns: number[];
}

export function readHeaderRows(
  rawHeaderRows: unknown[][],
  merges: readonly MergeRange[],
): ColumnSegments[] {
  const lines = rawHeaderRows.map((row) => row.map(toCellText));
  const columnCount = Math.max(0, ...lines.map((line) => line.length));
  const lastRowIndex = lines.length - 1;

  propagateMerges(lines, merges, columnCount, lastRowIndex);

  const columns: ColumnSegments[] = [];
  for (let col = 0; col < columnCount; col++) {
    const segments = lines.map((line) => line[col] ?? '').filter((s) => s !== '');
    if (segments.length === 0) continue;
    columns.push({ index: col, segments });
  }
  return columns;
}

export function resolveHeaders(
  columns: ColumnSegments[],
  condensed: boolean,
  separator: string,
): ResolvedHeader[] {
  if (!condensed) {
    return columns.map(({ index, segments }, i) => {
      const path = segments.join(separator);
      return { index: i, path, keys: [path], sourceColumns: [index] };
    });
  }

  const groupMap = new Map<string, { keys: string[]; sourceColumns: number[] }>();
  for (const { index, segments } of columns) {
    const groupKey = segments[0] ?? '';
    const leaf = segments.length > 1 ? (segments.at(-1) ?? groupKey) : groupKey;
    let group = groupMap.get(groupKey);
    if (!group) {
      group = { keys: [], sourceColumns: [] };
      groupMap.set(groupKey, group);
    }
    group.keys.push(leaf);
    group.sourceColumns.push(index);
  }

  return Array.from(groupMap.entries()).map(([path, { keys, sourceColumns }], i) => ({
    index: i,
    path,
    keys,
    sourceColumns,
  }));
}

function propagateMerges(
  lines: string[][],
  merges: readonly MergeRange[],
  columnCount: number,
  lastRowIndex: number,
): void {
  for (const merge of merges) {
    if (merge.startCol === merge.endCol) continue;
    if (merge.startRow > lastRowIndex) continue;
    const value = lines[merge.startRow]?.[merge.startCol];
    if (!value) continue;
    applyMergeValue(lines, merge, value, columnCount, lastRowIndex);
  }
}

function applyMergeValue(
  lines: string[][],
  merge: MergeRange,
  value: string,
  columnCount: number,
  lastRowIndex: number,
): void {
  const lastMergeRow = Math.min(merge.endRow, lastRowIndex);
  for (let row = merge.startRow; row <= lastMergeRow; row++) {
    const targetRow = lines[row];
    if (!targetRow) continue;
    for (let col = merge.startCol; col <= merge.endCol && col < columnCount; col++) {
      targetRow[col] = value;
    }
  }
}

export function toCellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}
