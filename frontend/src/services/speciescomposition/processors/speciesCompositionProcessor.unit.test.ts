import { describe, it, expect } from 'vitest';

import { SpeciesCompositionProcessor } from './speciesCompositionProcessor';

import type { SpeciesCompositionData } from '@/services/speciesComposition.types';

import {
  buildSpeciesCompositionFile,
  headerRow,
  dataRow,
  sampleValues,
} from '@/services/speciescomposition/validators/testHelper';

async function makeFile(rows: unknown[][]) {
  return buildSpeciesCompositionFile([headerRow(), ...rows]);
}

describe('SpeciesCompositionProcessor', () => {
  let processor: SpeciesCompositionProcessor;

  beforeEach(() => {
    processor = new SpeciesCompositionProcessor();
  });

  it('processes a valid spreadsheet with one district', async () => {
    const file = await makeFile([dataRow('DCC', sampleValues(1))]);
    const result = await processor.load(file);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = (result.data as SpeciesCompositionData[])[0];
    expect(data.rows).toHaveLength(1);

    const row = data.rows[0];
    expect(row.district.code).toBe('DCC');
    expect(row.district.description).toBe('');
    expect(row.balsam).toBe(sampleValues(1)[0]);
    expect(row.total).toBe(sampleValues(1)[18]);
  });

  it('processes a spreadsheet with multiple districts', async () => {
    const codes = ['DCC', 'DCK', 'DCR'];
    const rows = codes.map((code, i) => dataRow(code, sampleValues(i + 10)));
    const file = await makeFile(rows);
    const result = await processor.load(file);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = (result.data as SpeciesCompositionData[])[0];
    expect(data.rows).toHaveLength(3);
    expect(data.rows[0].district.code).toBe('DCC');
    expect(data.rows[1].district.code).toBe('DCK');
    expect(data.rows[2].district.code).toBe('DCR');
  });

  it('processes a district code with description suffix (e.g. "DCC - Cariboo")', async () => {
    const file = await makeFile([dataRow('DCC - Cariboo-Chilcotin', sampleValues(1))]);
    const result = await processor.load(file);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = (result.data as SpeciesCompositionData[])[0];
    expect(data.rows[0].district.code).toBe('DCC');
  });

  it('skips summary rows containing "Weighted Average"', async () => {
    const file = await makeFile([
      dataRow('DCC', sampleValues(1)),
      dataRow('Weighted Average (TOTAL)', sampleValues(50)),
    ]);
    const result = await processor.load(file);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = (result.data as SpeciesCompositionData[])[0];
    expect(data.rows).toHaveLength(1);
    expect(data.rows[0].district.code).toBe('DCC');
  });

  it('skips empty rows', async () => {
    const file = await makeFile([
      dataRow('DCC', sampleValues(1)),
      ['', ...Array(19).fill(null)],
      dataRow('DCK', sampleValues(2)),
    ]);
    const result = await processor.load(file);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = (result.data as SpeciesCompositionData[])[0];
    expect(data.rows).toHaveLength(2);
  });

  it('treats non-numeric species values as 0', async () => {
    const values = sampleValues(1);
    values[0] = 'not-a-number' as unknown as number;
    const file = await makeFile([dataRow('DCC', values)]);
    const result = await processor.load(file);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const data = (result.data as SpeciesCompositionData[])[0];
    expect(data.rows[0].balsam).toBe(0);
  });

  it('returns failure for corrupt file', async () => {
    const corrupt = new File([new ArrayBuffer(4)], 'bad.xlsx');
    const result = await processor.load(corrupt);
    expect(result.success).toBe(false);
  });

  it('returns failure when spreadsheet has headers but no data rows', async () => {
    const file = await buildSpeciesCompositionFile([headerRow()]);
    const result = await processor.load(file);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain('at least one data row');
    }
  });

  it('returns failure when spreadsheet has no valid headers and no data', async () => {
    const file = await buildSpeciesCompositionFile([['Something', 'Else']]);
    const result = await processor.load(file);

    expect(result.success).toBe(false);
  });

  it('returns failure when required species headers are missing', async () => {
    const file = await buildSpeciesCompositionFile([
      ['District', 'Balsam', 'Cedar'], // only 2 of 19 species
      ['DCC', 0.1, 0.2],
    ]);
    const result = await processor.load(file);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain('Missing species columns');
    }
  });

  it('returns failure for empty worksheet', async () => {
    const file = await buildSpeciesCompositionFile([]);
    const result = await processor.load(file);

    expect(result.success).toBe(false);
  });
});
