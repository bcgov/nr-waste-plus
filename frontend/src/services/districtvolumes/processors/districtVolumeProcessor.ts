import type { FileProcessor, ProcessorResult } from '@/components/Form/FileUploadInput/fileProcessor';
import { ExcelReader } from '@/services/spreadsheet/excelReader';
import { MatrixParser } from '@/services/spreadsheet/matrixParser';
import { interiorMatrixConfig } from '@/services/districtvolumes/config/interiorMatrixConfig';
import { coastMatrixConfig } from '@/services/districtvolumes/config/coastMatrixConfig';
import { mapInteriorSpreadsheet } from '@/services/districtvolumes/interior/interiorMapper';
import { mapCoastSpreadsheet } from '@/services/districtvolumes/coast/coastMapper';
import type { TableData } from '@/services/districtvolumes.types';

enum SpreadsheetVariant {
  INTERIOR = 'INTERIOR',
  COAST = 'COAST',
}

function detectVariant(reader: ExcelReader, file: File): Promise<SpreadsheetVariant> {
  return reader.listSheets(file).then((sheets) => {
    const upperSheets = sheets.map((s) => s.trim().toUpperCase());
    if (upperSheets.includes('INTERIOR')) return SpreadsheetVariant.INTERIOR;
    if (upperSheets.includes('COAST')) return SpreadsheetVariant.COAST;
    throw new Error(
      'Could not detect spreadsheet format. Expected a sheet named "Interior" or "Coast".',
    );
  });
}

export class DistrictVolumeProcessor implements FileProcessor<TableData> {
  async load(file: File): Promise<ProcessorResult<TableData>> {
    const reader = new ExcelReader();

    let variant: SpreadsheetVariant;
    try {
      variant = await detectVariant(reader, file);
    } catch (e) {
      return {
        success: false,
        errors: [(e as Error).message],
      };
    }

    const config = variant === SpreadsheetVariant.INTERIOR ? interiorMatrixConfig : coastMatrixConfig;

    let worksheet;
    try {
      worksheet = await reader.read(file, config.sheetName);
    } catch (e) {
      return {
        success: false,
        errors: [(e as Error).message],
      };
    }

    const parser = new MatrixParser();
    const parseResult = parser.parse(worksheet, config);

    if (parseResult.errors.length > 0) {
      return {
        success: false,
        errors: parseResult.errors.map((e) => `Row ${e.row}: ${e.message}`),
      };
    }

    if (parseResult.data.length === 0) {
      return {
        success: false,
        errors: ['No data rows found in the spreadsheet.'],
      };
    }

    let data: TableData;

    if (variant === SpreadsheetVariant.INTERIOR) {
      data = mapInteriorSpreadsheet(parseResult.data);
    } else {
      data = mapCoastSpreadsheet(parseResult.data);
    }

    return { success: true, data: [data] };
  }
}
