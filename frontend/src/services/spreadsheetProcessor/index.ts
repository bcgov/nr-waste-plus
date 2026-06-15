export { SpreadsheetProcessor, type SpreadsheetConfig } from './spreadsheetProcessor';
export {
  type ColumnRemapEntry,
  type ColumnMap,
  toCodeFriendlyKey,
  applyColumnMap,
  buildProcessorHeaders,
} from './columnMap';
export {
  type ColumnSegments,
  type ResolvedHeader,
  readHeaderRows,
  resolveHeaders,
  toCellText,
} from './headerParser';
export { type ResultFormatter, toTableResult, toMatrixResult, isEmptyRow } from './rowBuilders';
