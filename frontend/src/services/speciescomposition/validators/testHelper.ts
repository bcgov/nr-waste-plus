import ExcelJS from 'exceljs';

export async function buildSpeciesCompositionFile(
  rows: unknown[][],
  sheetName = 'Species Composition',
): Promise<File> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  for (const row of rows) {
    ws.addRow(row);
  }
  const buffer = (await wb.xlsx.writeBuffer()) as ArrayBuffer;
  return new File([buffer], 'species-composition.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

/** The 19 species header names in spreadsheet column order (B–T). */
export const SPECIES_HEADERS = [
  'Balsam',
  'Cedar',
  'Cottonwood',
  'Cypress',
  'Fir',
  'Hemlock',
  'Larch',
  'Maple',
  'Pine',
  'Poplar',
  'Redcedar',
  'Redwood',
  'Spruce',
  'Whitebirch',
  'Whitepine',
  'Yew',
  'Other',
  'Unknown',
  'Total',
];

/** Header row: ['District', ...19 species headers] */
export function headerRow(): unknown[] {
  return ['District', ...SPECIES_HEADERS];
}

/** Build a data row: [districtCode, ...19 numeric values]. */
export function dataRow(code: string, values: number[]): unknown[] {
  return [code, ...values];
}

/** Sample valid values (all between 0 and 1). */
export function sampleValues(seed: number): number[] {
  return Array.from({ length: 19 }, (_, i) => {
    const v = ((seed + i * 0.01) % 100) / 100;
    return Math.round(v * 1000) / 1000;
  });
}
