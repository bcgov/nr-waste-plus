import { SpreadsheetProcessor } from '../spreadsheetProcessor';

import { interiorConfig, interiorRowSchema, type InteriorRow } from './config';

export const interiorProcessor = new SpreadsheetProcessor<InteriorRow>(
  interiorConfig,
  interiorRowSchema,
);
