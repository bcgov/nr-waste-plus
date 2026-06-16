import {
  type FileProcessor,
  type ProcessorResult,
} from '@/components/Form/FileUploadInput/fileProcessor';

import { coastProcessor } from './coast/processor';
import type { CoastRow } from './coast/config';
import { interiorProcessor } from './interior/processor';
import type { InteriorRow } from './interior/config';
import { identifySpreadsheet } from './spreadsheetIdentifier';
import type { SpreadsheetKind } from './types';

type AnyRow = InteriorRow | CoastRow;

export class CompositeSpreadsheetProcessor implements FileProcessor<AnyRow> {
  private _kind: SpreadsheetKind | null = null;

  get kind(): SpreadsheetKind | null {
    return this._kind;
  }

  async load(file: File): Promise<ProcessorResult<AnyRow>> {
    let kind: SpreadsheetKind;
    try {
      kind = await identifySpreadsheet(file);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, errors: [message] };
    }

    this._kind = kind;

    try {
      const processor =
        kind === 'interior' ? interiorProcessor : coastProcessor;
      return (await processor.load(file)) as ProcessorResult<AnyRow>;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        errors: [`"${file.name}" could not be processed: ${message}`],
      };
    }
  }
}
