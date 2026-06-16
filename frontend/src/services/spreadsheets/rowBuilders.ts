import { applyColumnMap, buildProcessorHeaders, type ColumnMap } from './columnMap';
import { type ResolvedHeader } from './headerParser';

import {
  type ProcessorMatrixSuccess,
  type ProcessorSuccess,
} from '@/components/Form/FileUploadInput/fileProcessor';

export type ResultFormatter = (
  dataRows: unknown[][],
  headers: ResolvedHeader[],
  columnMap: ColumnMap,
  skipEmptyRows: boolean,
) => ProcessorSuccess<Record<string, unknown>> | ProcessorMatrixSuccess<Record<string, unknown>>;

export function toTableResult(
  dataRows: unknown[][],
  headers: ResolvedHeader[],
  columnMap: ColumnMap,
  skipEmptyRows: boolean,
): ProcessorSuccess<Record<string, unknown>> {
  const data = buildTable(dataRows, headers, columnMap, skipEmptyRows);
  const processorHeaders = buildProcessorHeaders(headers, columnMap);
  return { success: true, data, headers: processorHeaders };
}

export function toMatrixResult(
  dataRows: unknown[][],
  headers: ResolvedHeader[],
  columnMap: ColumnMap,
  skipEmptyRows: boolean,
): ProcessorMatrixSuccess<Record<string, unknown>> {
  const data = buildMatrix(dataRows, headers, columnMap, skipEmptyRows);
  const processorHeaders = buildProcessorHeaders(headers.slice(1), columnMap);
  return { success: true, matrix: true, data, headers: processorHeaders };
}

function buildTable(
  dataRows: unknown[][],
  headers: ResolvedHeader[],
  columnMap: ColumnMap,
  skipEmptyRows: boolean,
): Record<string, unknown>[] {
  const result: Record<string, unknown>[] = [];
  for (const row of dataRows) {
    if (skipEmptyRows && isEmptyRow(row)) continue;
    result.push(applyColumnMap(buildRow(row, headers), columnMap));
  }
  return result;
}

function buildMatrix(
  dataRows: unknown[][],
  headers: ResolvedHeader[],
  columnMap: ColumnMap,
  skipEmptyRows: boolean,
): Record<string, Record<string, unknown>[]> {
  const keyHeader = headers[0];
  const valueHeaders = headers.slice(1);
  const matrix: Record<string, Record<string, unknown>[]> = {};

  if (!keyHeader) return matrix;

  for (const row of dataRows) {
    if (skipEmptyRows && isEmptyRow(row)) continue;
    const keyCol = keyHeader.sourceColumns[0] ?? 0;
    const rowKey = String(row[keyCol] ?? '').trim();
    if (!rowKey) continue;

    const valueRow = applyColumnMap(buildRow(row, valueHeaders), columnMap);
    if (!matrix[rowKey]) matrix[rowKey] = [];
    matrix[rowKey].push(valueRow);
  }

  return matrix;
}

function buildRow(row: unknown[], headers: ResolvedHeader[]): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const { path, keys, sourceColumns } of headers) {
    if (keys.length === 1 && keys[0] === path) {
      record[path] = row[sourceColumns[0] ?? 0] ?? null;
    } else {
      const group: Record<string, unknown> = {};
      for (let i = 0; i < keys.length; i++) {
        group[keys[i] ?? ''] = row[sourceColumns[i] ?? 0] ?? null;
      }
      record[path] = group;
    }
  }
  return record;
}

export function isEmptyRow(row: unknown[]): boolean {
  return row.every((cell) => cell === null || cell === undefined || String(cell).trim() === '');
}
