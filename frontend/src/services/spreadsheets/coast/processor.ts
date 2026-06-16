import { SpreadsheetProcessor } from '../spreadsheetProcessor';

import { coastConfig, coastRowSchema, type CoastRow } from './config';

export const coastProcessor = new SpreadsheetProcessor<CoastRow>(coastConfig, coastRowSchema);
