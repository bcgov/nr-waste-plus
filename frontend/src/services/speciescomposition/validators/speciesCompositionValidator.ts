import {
  DISTRICT_CODE_REGEX,
  EXPECTED_DISTRICT_CODES,
  EXPECTED_SPECIES_HEADERS,
  HEADER_TO_SPECIES_KEY,
  SUMMARY_ROW_PATTERNS,
} from '@/services/speciescomposition/config/speciesCompositionConfig';
import { ExcelReader } from '@/services/spreadsheet/excelReader';

function normalise(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function extractDistrictCode(raw: string): string {
  const trimmed = raw.trim();
  const dashIdx = trimmed.indexOf(' - ');
  return dashIdx > 0 ? trimmed.slice(0, dashIdx).trim() : trimmed;
}

function getCellText(worksheet: import('exceljs').Worksheet, row: number, col: number): string {
  const cell = worksheet.getRow(row)?.getCell(col);
  return cell?.value != null ? String(cell.value).replace(/\s+/g, ' ').trim() : '';
}

export async function speciesCompositionValidator(file: File): Promise<string[]> {
  const errors: string[] = [];
  const reader = new ExcelReader();

  let worksheet: import('exceljs').Worksheet;
  try {
    worksheet = await reader.read(file);
  } catch {
    errors.push('File could not be read. Ensure it is a valid .xlsx file.');
    return errors;
  }

  if (worksheet.rowCount < 2) {
    errors.push('Spreadsheet must contain a header row and at least one data row.');
    return errors;
  }

  // ── Validate header row contains all 19 species columns ──────────────
  const headerRow = worksheet.getRow(1);
  const foundHeaders = new Set<string>();

  for (let c = 2; c <= headerRow.cellCount; c++) {
    const raw = String(headerRow.getCell(c).value ?? '').trim();
    if (!raw) continue;

    const key = HEADER_TO_SPECIES_KEY[normalise(raw)];
    if (key) {
      foundHeaders.add(key);
    }
  }

  for (const expected of EXPECTED_SPECIES_HEADERS) {
    const key = HEADER_TO_SPECIES_KEY[normalise(expected)];
    if (key && !foundHeaders.has(key)) {
      errors.push(`Missing species column header: "${expected}".`);
    }
  }

  // ── Validate data rows ───────────────────────────────────────────────
  const seenDistricts = new Map<string, number>();

  for (let r = 2; r <= worksheet.rowCount; r++) {
    const districtRaw = String(worksheet.getRow(r).getCell(1).value ?? '').trim();
    if (!districtRaw) continue;

    // Skip summary/average rows
    if (SUMMARY_ROW_PATTERNS.test(districtRaw)) continue;

    // Extract the 3-letter code from cells like "DCC - Cariboo-Chilcotin"
    const districtCode = extractDistrictCode(districtRaw);

    // District code validation
    if (!DISTRICT_CODE_REGEX.test(districtCode)) {
      errors.push(
        `Invalid district code at row ${r}: "${districtRaw}". District codes must be 3 uppercase letters.`,
      );
      continue;
    }

    // Duplicate check (on extracted code)
    const prevRow = seenDistricts.get(districtCode);
    if (prevRow) {
      errors.push(`Duplicate district code "${districtCode}" found at rows ${prevRow} and ${r}.`);
    } else {
      seenDistricts.set(districtCode, r);
    }

    // Species value validation (columns B–T)
    for (let c = 2; c <= headerRow.cellCount; c++) {
      const headerText = getCellText(worksheet, 1, c);
      if (!headerText) continue;

      const key = HEADER_TO_SPECIES_KEY[normalise(headerText)];
      if (!key) continue;

      const cell = worksheet.getRow(r).getCell(c);

      if (cell.value == null || cell.value === '') {
        errors.push(
          `Missing value at row ${r}, column ${c} (species "${headerText}", district "${districtRaw}").`,
        );
      } else if (typeof cell.value !== 'number') {
        errors.push(
          `Non-numeric value at row ${r}, column ${c}: "${String(cell.value)}" (species "${headerText}", district "${districtRaw}").`,
        );
      } else if (cell.value < 0 || cell.value > 1) {
        errors.push(
          `Value out of range at row ${r}, column ${c}: ${cell.value} (species "${headerText}", district "${districtRaw}"). Expected 0–1.`,
        );
      }
    }
  }

  // ── Validate all 23 expected district codes are present ──────────────
  for (const expectedCode of EXPECTED_DISTRICT_CODES) {
    if (!seenDistricts.has(expectedCode)) {
      errors.push(`Missing expected district code: "${expectedCode}".`);
    }
  }

  return errors;
}
