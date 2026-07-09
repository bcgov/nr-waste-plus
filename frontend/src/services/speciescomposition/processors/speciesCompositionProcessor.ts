import type {
  FileProcessor,
  ProcessorResult,
} from '@/components/Form/FileUploadInput/fileProcessor';
import type {
  SpeciesCompositionData,
  SpeciesCompositionRow,
  SpeciesKey,
} from '@/services/speciescomposition/speciesComposition.types';

import {
  HEADER_TO_SPECIES_KEY,
  EXPECTED_SPECIES_HEADERS,
} from '@/services/speciescomposition/config/speciesCompositionConfig';
import { ExcelReader } from '@/services/spreadsheet/excelReader';

interface ColumnMapping {
  colIndex: number;
  key: SpeciesKey;
}

interface MappingResult {
  ok: true;
  mapping: ColumnMapping[];
}

interface MappingError {
  ok: false;
  errors: string[];
}

type MappingOutcome = MappingResult | MappingError;

function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function buildColumnMapping(worksheet: import('exceljs').Worksheet): MappingOutcome {
  const headerRow = worksheet.getRow(1);
  const mapping: ColumnMapping[] = [];
  const missing: string[] = [];

  for (let c = 2; c <= headerRow.cellCount; c++) {
    const raw = String(headerRow.getCell(c).value ?? '').trim();
    if (!raw) continue;

    const key = HEADER_TO_SPECIES_KEY[normalise(raw)];
    if (key) {
      mapping.push({ colIndex: c, key });
    }
  }

  // Check which expected headers are missing from the mapping
  const mappedKeys = new Set(mapping.map((m) => m.key));

  for (const expected of EXPECTED_SPECIES_HEADERS) {
    const key = HEADER_TO_SPECIES_KEY[normalise(expected)];
    if (key && !mappedKeys.has(key)) {
      missing.push(expected);
    }
  }

  if (missing.length > 0) {
    return { ok: false, errors: [`Missing species columns in header: ${missing.join(', ')}`] };
  }

  return { ok: true, mapping };
}

function extractDistrictCode(raw: string): string {
  const trimmed = raw.trim();
  const dashIdx = trimmed.indexOf(' - ');
  return dashIdx > 0 ? trimmed.slice(0, dashIdx).trim() : trimmed;
}

export class SpeciesCompositionProcessor implements FileProcessor<SpeciesCompositionData> {
  async load(file: File): Promise<ProcessorResult<SpeciesCompositionData>> {
    const reader = new ExcelReader();

    let worksheet: import('exceljs').Worksheet;
    try {
      worksheet = await reader.read(file);
    } catch (e) {
      return {
        success: false,
        errors: [(e as Error).message],
      };
    }

    if (worksheet.rowCount < 2) {
      return {
        success: false,
        errors: ['Spreadsheet must contain a header row and at least one data row.'],
      };
    }

    const outcome = buildColumnMapping(worksheet);
    if (!outcome.ok) {
      return { success: false, errors: outcome.errors };
    }

    const { mapping } = outcome;
    const rows: SpeciesCompositionRow[] = [];

    for (let r = 2; r <= worksheet.rowCount; r++) {
      const districtRaw = String(worksheet.getRow(r).getCell(1).value ?? '').trim();
      if (!districtRaw) continue;

      // Skip summary/average rows
      if (/weighted|average|total/i.test(districtRaw)) continue;

      const code = extractDistrictCode(districtRaw);
      if (!code) continue;

      const speciesValues: Record<SpeciesKey, number> = {
        balsam: 0,
        cedar: 0,
        cottonwood: 0,
        cypress: 0,
        fir: 0,
        hemlock: 0,
        larch: 0,
        maple: 0,
        pine: 0,
        poplar: 0,
        redcedar: 0,
        redwood: 0,
        spruce: 0,
        whitebirch: 0,
        whitepine: 0,
        yew: 0,
        other: 0,
        unknown: 0,
        total: 0,
      };

      for (const { colIndex, key } of mapping) {
        const cellValue = worksheet.getRow(r).getCell(colIndex).value;
        speciesValues[key] = typeof cellValue === 'number' ? cellValue : 0;
      }

      const row: SpeciesCompositionRow = {
        district: { code, description: '' },
        ...speciesValues,
      };

      rows.push(row);
    }

    if (rows.length === 0) {
      return {
        success: false,
        errors: ['No data rows found in the spreadsheet.'],
      };
    }

    return { success: true, data: [{ rows }] };
  }
}
