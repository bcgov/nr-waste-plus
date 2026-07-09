import { describe, it, expect } from 'vitest';

import { speciesCompositionValidator } from './speciesCompositionValidator';
import { buildSpeciesCompositionFile, headerRow, dataRow, sampleValues } from './testHelper';

import { EXPECTED_DISTRICT_CODES } from '@/services/speciescomposition/config/speciesCompositionConfig';

async function makeFile(rows: unknown[][]) {
  return buildSpeciesCompositionFile([headerRow(), ...rows]);
}

describe('speciesCompositionValidator', () => {
  it('returns empty errors for a valid spreadsheet', async () => {
    // Include all 23 districts with valid values
    const rows = EXPECTED_DISTRICT_CODES.map((code, i) => dataRow(code, sampleValues(i + 1)));
    const file = await makeFile(rows);

    const errors = await speciesCompositionValidator(file);
    expect(errors).toHaveLength(0);
  });

  it('returns error for missing species column headers', async () => {
    const file = await buildSpeciesCompositionFile([
      ['District', 'Balsam', 'Cedar'], // only 2 of 19 species
      ...EXPECTED_DISTRICT_CODES.map((code, i) => [code, ...sampleValues(i + 1).slice(0, 2)]),
    ]);

    const errors = await speciesCompositionValidator(file);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('Missing species column header'))).toBe(true);
  });

  it('returns error for non-numeric species values', async () => {
    const values = sampleValues(1);
    values[2] = 'not-a-number' as unknown as number;
    const file = await makeFile([
      dataRow('DCC', values),
      ...EXPECTED_DISTRICT_CODES.slice(1).map((code, i) => dataRow(code, sampleValues(i + 2))),
    ]);

    const errors = await speciesCompositionValidator(file);
    expect(errors.some((e) => e.includes('Non-numeric value'))).toBe(true);
  });

  it('returns error for values out of range (negative)', async () => {
    const values = sampleValues(1);
    values[0] = -0.5;
    const file = await makeFile([
      dataRow('DCC', values),
      ...EXPECTED_DISTRICT_CODES.slice(1).map((code, i) => dataRow(code, sampleValues(i + 2))),
    ]);

    const errors = await speciesCompositionValidator(file);
    expect(errors.some((e) => e.includes('out of range'))).toBe(true);
  });

  it('returns error for values out of range (above 1)', async () => {
    const values = sampleValues(1);
    values[0] = 1.5;
    const file = await makeFile([
      dataRow('DCC', values),
      ...EXPECTED_DISTRICT_CODES.slice(1).map((code, i) => dataRow(code, sampleValues(i + 2))),
    ]);

    const errors = await speciesCompositionValidator(file);
    expect(errors.some((e) => e.includes('out of range'))).toBe(true);
  });

  it('returns error for invalid district code format', async () => {
    const file = await makeFile([
      dataRow('DCCC', sampleValues(1)), // 4 letters
      ...EXPECTED_DISTRICT_CODES.slice(1).map((code, i) => dataRow(code, sampleValues(i + 2))),
    ]);

    const errors = await speciesCompositionValidator(file);
    expect(errors.some((e) => e.includes('Invalid district code'))).toBe(true);
  });

  it('returns error for duplicate district codes', async () => {
    const file = await makeFile([
      dataRow('DCC', sampleValues(1)),
      dataRow('DCC', sampleValues(2)),
      ...EXPECTED_DISTRICT_CODES.slice(1).map((code, i) => dataRow(code, sampleValues(i + 10))),
    ]);

    const errors = await speciesCompositionValidator(file);
    expect(errors.some((e) => e.includes('Duplicate district code "DCC"'))).toBe(true);
  });

  it('returns error for missing expected district codes', async () => {
    // Only include 22 of the 23 districts
    const rows = EXPECTED_DISTRICT_CODES.slice(0, 22).map((code, i) =>
      dataRow(code, sampleValues(i + 1)),
    );
    const file = await makeFile(rows);

    const errors = await speciesCompositionValidator(file);
    expect(errors.some((e) => e.includes('Missing expected district code'))).toBe(true);
  });

  it('does not flag summary row as invalid district code', async () => {
    const file = await makeFile([
      dataRow('DCC', sampleValues(1)),
      dataRow(' Weighted Average (TOTAL)', sampleValues(50)),
      ...EXPECTED_DISTRICT_CODES.slice(1).map((code, i) => dataRow(code, sampleValues(i + 2))),
    ]);

    const errors = await speciesCompositionValidator(file);
    expect(errors.some((e) => e.includes('Invalid district code'))).toBe(false);
    expect(errors.some((e) => e.includes('Weighted'))).toBe(false);
  });

  it('accepts district cells with description suffix (e.g. "DCC - Cariboo")', async () => {
    const rows = EXPECTED_DISTRICT_CODES.map((code, i) =>
      i === 0
        ? dataRow(`${code} - Cariboo-Chilcotin`, sampleValues(i + 1))
        : dataRow(code, sampleValues(i + 1)),
    );
    const file = await makeFile(rows);

    const errors = await speciesCompositionValidator(file);
    expect(errors).toHaveLength(0);
  });

  it('returns error for empty spreadsheet', async () => {
    const file = await buildSpeciesCompositionFile([]);
    const errors = await speciesCompositionValidator(file);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for corrupt file', async () => {
    const corrupt = new File([new ArrayBuffer(4)], 'bad.xlsx');
    const errors = await speciesCompositionValidator(corrupt);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('returns error for missing species cell values', async () => {
    const values = sampleValues(1);
    values[3] = null as unknown as number;
    const file = await makeFile([
      dataRow('DCC', values),
      ...EXPECTED_DISTRICT_CODES.slice(1).map((code, i) => dataRow(code, sampleValues(i + 2))),
    ]);

    const errors = await speciesCompositionValidator(file);
    expect(errors.some((e) => e.includes('Missing value'))).toBe(true);
  });
});
