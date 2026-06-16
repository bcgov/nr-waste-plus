import { describe, it, expect, beforeEach, vi } from 'vitest';

import { SpreadsheetProcessor } from './spreadsheetProcessor';

import { interiorConfig, interiorRowSchema } from './interior/config';
import { coastConfig, coastRowSchema } from './coast/config';

const INTERIOR_HEADER = [
  'District',
  'Dry Belt m3/ha - Avoidable Sawlog   Waste m3/Ha',
  'Dry Belt m3/ha - Avoidable Grade Y/4 Waste m3/Ha',
  'Dry Belt m3/ha -  Unavoidable  m3/ha',
  'Dry Belt m3/ha - Total Avoidable \r\nSawlog, Grade 4 \r\n+ Unavoidable \r\nWaste m3/Ha',
  'Transition Zone m3/ha - Avoidable Sawlog   Waste m3/Ha',
  'Transition Zone m3/ha - Avoidable Grade Y/4 Waste m3/Ha',
  'Transition Zone m3/ha -  Unavoidable  m3/ha',
  'Transition Zone m3/ha - Total Avoidable \r\nSawlog, Grade 4 \r\n+ Unavoidable \r\nWaste m3/Ha',
  'Wet Belt m3/ha - Avoidable Sawlog   Waste m3/Ha',
  'Wet Belt m3/ha - Avoidable Grade Y/4 Waste m3/Ha',
  'Wet Belt m3/ha -  Unavoidable  m3/ha',
  'Wet Belt m3/ha - Total Avoidable \r\nSawlog, Grade 4 \r\n+ Unavoidable \r\nWaste m3/Ha',
];

function interiorRow(...values: unknown[]) {
  const row: unknown[] = new Array(INTERIOR_HEADER.length).fill(null);
  for (let i = 0; i < values.length; i++) row[i] = values[i];
  return row;
}

const COAST_HEADER = [
  'District',
  'Mature - Avoidable Sawlog \nFull Rate\n(m3/ha)',
  'Mature - Avoidable \n0.25\n(m3/ha)',
  'Mature - Avoidable Grade Y (m3/ha)',
  'Mature - Unavoidable Grade Y\n(m3/ha)',
  'Mature - Total All Grades All Class (m3/ha)',
  'Immature - Avoidable Sawlog \nFull Rate\n(m3/ha)',
  'Immature - Avoidable \n0.25\n(m3/ha)',
  'Immature - Avoidable Grade Y (m3/ha)',
  'Immature - Unavoidable Grade Y\n(m3/ha)',
  'Immature - Total All Grades All Class (m3/ha)',
  'Heli Mulitplier',
];

function coastRow(...values: unknown[]) {
  const row: unknown[] = new Array(COAST_HEADER.length).fill(null);
  for (let i = 0; i < values.length; i++) row[i] = values[i];
  return row;
}

describe('interiorConfig with SpreadsheetProcessor (table mode)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('produces flat rows with columnMap remapping', async () => {
    const processor = new SpreadsheetProcessor({
      ...interiorConfig,
      matrix: false,
      headerRows: 1,
    });
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [
        ['District', 'Dry Belt m3/ha - Avoidable Sawlog   Waste m3/Ha'],
        ['DCC', 2.04],
      ],
      merges: [],
    });

    const result = await processor.load(new File([''], 'interior.xlsx'));
    expect(result.success).toBe(true);
    if (result.success && !('matrix' in result)) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        district: 'DCC',
        dryBeltAvoidableSawlog: 2.04,
      });
    }
  });

  it('validates interior rows against schema with all columns', async () => {
    const processor = new SpreadsheetProcessor(
      { ...interiorConfig, matrix: false, headerRows: 1 },
      interiorRowSchema,
    );
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [INTERIOR_HEADER, interiorRow('DCC', 2.04), interiorRow('DMH', 1.87)],
      merges: [],
    });

    const result = await processor.load(new File([''], 'interior.xlsx'));
    expect(result.success).toBe(true);
    if (result.success && !('matrix' in result)) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].district).toBe('DCC');
      expect(result.data[0].dryBeltAvoidableSawlog).toBe(2.04);
    }
  });

  it('rejects interior data with invalid schema', async () => {
    const processor = new SpreadsheetProcessor(
      { ...interiorConfig, matrix: false, headerRows: 1 },
      interiorRowSchema,
    );
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [INTERIOR_HEADER, interiorRow('', 'not-a-number')],
      merges: [],
    });

    const result = await processor.load(new File([''], 'bad.xlsx'));
    expect(result.success).toBe(false);
  });

  it('returns failure when interior sheet has no data rows', async () => {
    const processor = new SpreadsheetProcessor({
      ...interiorConfig,
      matrix: false,
      headerRows: 1,
    });
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [INTERIOR_HEADER],
      merges: [],
    });

    const result = await processor.load(new File([''], 'empty.xlsx'));
    expect(result.success).toBe(false);
  });
});

describe('interiorConfig with SpreadsheetProcessor (matrix mode)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('produces keyed matrix with first column as key (key stripped from values)', async () => {
    const processor = new SpreadsheetProcessor({
      ...interiorConfig,
      matrix: true,
      headerRows: 1,
    });
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [
        ['District', 'Dry Belt m3/ha - Avoidable Sawlog   Waste m3/Ha'],
        ['DCC', 2.04],
        ['DMH', 1.87],
      ],
      merges: [],
    });

    const result = await processor.load(new File([''], 'interior.xlsx'));
    expect(result.success).toBe(true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(Object.keys(result.data)).toEqual(['DCC', 'DMH']);
      expect(result.data['DCC'][0]).toEqual({
        dryBeltAvoidableSawlog: 2.04,
      });
    }
  });

  it('groups duplicate keys in matrix mode', async () => {
    const processor = new SpreadsheetProcessor({
      ...interiorConfig,
      matrix: true,
      headerRows: 1,
    });
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [
        ['District', 'Dry Belt m3/ha - Avoidable Sawlog   Waste m3/Ha'],
        ['DCC', 2.04],
        ['DCC', 3.1],
      ],
      merges: [],
    });

    const result = await processor.load(new File([''], 'interior.xlsx'));
    expect(result.success).toBe(true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(result.data['DCC']).toHaveLength(2);
    }
  });

  it('produces headers in matrix mode (key column excluded)', async () => {
    const processor = new SpreadsheetProcessor({
      ...interiorConfig,
      matrix: true,
      headerRows: 1,
    });
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [
        ['District', 'Dry Belt m3/ha - Avoidable Sawlog   Waste m3/Ha'],
        ['DCC', 2.04],
      ],
      merges: [],
    });

    const result = await processor.load(new File([''], 'interior.xlsx'));
    expect(result.success).toBe(true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(result.headers).toHaveLength(1);
      expect(result.headers![0].key).toBe('dryBeltAvoidableSawlog');
    }
  });
});

describe('coastConfig with SpreadsheetProcessor (table mode)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('produces flat rows with columnMap remapping', async () => {
    const processor = new SpreadsheetProcessor({
      ...coastConfig,
      matrix: false,
      headerRows: 1,
    });
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [
        ['District', 'Mature - Avoidable Sawlog \nFull Rate\n(m3/ha)', 'Heli Mulitplier'],
        ['DCK', 16.19, '1.25x'],
      ],
      merges: [],
    });

    const result = await processor.load(new File([''], 'coast.xlsx'));
    expect(result.success).toBe(true);
    if (result.success && !('matrix' in result)) {
      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        district: 'DCK',
        matureAvoidableSawlog: 16.19,
        heliMultiplier: '1.25x',
      });
    }
  });

  it('validates coast rows against schema with all columns', async () => {
    const processor = new SpreadsheetProcessor(
      { ...coastConfig, matrix: false, headerRows: 1 },
      coastRowSchema,
    );
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [COAST_HEADER, coastRow('DCK', 16.19, null, null, null, null, 8.5)],
      merges: [],
    });

    const result = await processor.load(new File([''], 'coast.xlsx'));
    expect(result.success).toBe(true);
    if (result.success && !('matrix' in result)) {
      expect(result.data[0].district).toBe('DCK');
      expect(result.data[0].matureAvoidableSawlog).toBe(16.19);
      expect(result.data[0].immatureAvoidableSawlog).toBe(8.5);
    }
  });

  it('returns failure when coast sheet has no data rows', async () => {
    const processor = new SpreadsheetProcessor({
      ...coastConfig,
      matrix: false,
      headerRows: 1,
    });
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [['District', 'Mature - Avoidable Sawlog \nFull Rate\n(m3/ha)']],
      merges: [],
    });

    const result = await processor.load(new File([''], 'empty.xlsx'));
    expect(result.success).toBe(false);
  });
});

describe('coastConfig with SpreadsheetProcessor (matrix mode)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('produces keyed matrix with first column as key (key stripped from values)', async () => {
    const processor = new SpreadsheetProcessor({
      ...coastConfig,
      matrix: true,
      headerRows: 1,
    });
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [
        ['District', 'Mature - Avoidable Sawlog \nFull Rate\n(m3/ha)'],
        ['DCK', 16.19],
        ['DKL', 14.5],
      ],
      merges: [],
    });

    const result = await processor.load(new File([''], 'coast.xlsx'));
    expect(result.success).toBe(true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(Object.keys(result.data)).toEqual(['DCK', 'DKL']);
      expect(result.data['DCK'][0]).toEqual({
        matureAvoidableSawlog: 16.19,
      });
    }
  });

  it('produces headers in matrix mode (key column excluded)', async () => {
    const processor = new SpreadsheetProcessor({
      ...coastConfig,
      matrix: true,
      headerRows: 1,
    });
    vi.spyOn(processor['reader'], 'readRawWithMerges').mockResolvedValue({
      rows: [
        ['District', 'Mature - Avoidable Sawlog \nFull Rate\n(m3/ha)'],
        ['DCK', 16.19],
      ],
      merges: [],
    });

    const result = await processor.load(new File([''], 'coast.xlsx'));
    expect(result.success).toBe(true);
    if (result.success && 'matrix' in result && result.matrix) {
      expect(result.headers).toHaveLength(1);
      expect(result.headers![0].key).toBe('matureAvoidableSawlog');
    }
  });
});
