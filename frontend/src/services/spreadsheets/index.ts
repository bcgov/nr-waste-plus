export { type SpreadsheetKind } from './types';

export { type InteriorRow, interiorConfig } from './interior/config';
export { interiorProcessor } from './interior/processor';
export { toInteriorTableHeader } from './interior/tableHeaders';

export { type CoastRow, coastConfig } from './coast/config';
export { coastProcessor } from './coast/processor';
export { toCoastTableHeader } from './coast/tableHeaders';

export { identifySpreadsheet } from './spreadsheetIdentifier';
export { createSpreadsheetValidator } from './workbookValidator';
export { CompositeSpreadsheetProcessor } from './compositeProcessor';

// Base processor library
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
