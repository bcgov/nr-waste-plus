import ExcelJS from 'exceljs';
import { describe, it, expect } from 'vitest';

import { DistrictVolumeProcessor } from './districtVolumeProcessor';

import type { TableData } from '@/services/districtvolumes.types';

async function buildXlsxBuffer(
  rows: unknown[][],
  sheetName: string,
  mergeCells?: string[],
): Promise<ArrayBuffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  for (const row of rows) {
    ws.addRow(row);
  }
  if (mergeCells) {
    for (const range of mergeCells) {
      ws.mergeCells(range);
    }
  }
  return (await wb.xlsx.writeBuffer()) as ArrayBuffer;
}

function bufferToFile(buffer: ArrayBuffer, name: string): File {
  return new File([buffer], name, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}

async function buildInteriorFile(): Promise<File> {
  const buf = await buildXlsxBuffer(
    [
      [
        'District',
        'Dry Belt m3/ha',
        null,
        null,
        null,
        'Transition Zone m3/ha',
        null,
        null,
        null,
        'Wet Belt m3/ha',
        null,
        null,
        null,
      ],
      [
        null,
        'Avoidable Sawlog   Waste m3/Ha',
        'Avoidable Grade Y/4 Waste m3/Ha',
        ' Unavoidable  m3/ha',
        'Total Avoidable \nSawlog, Grade 4 \n+ Unavoidable \nWaste m3/Ha',
        'Avoidable Sawlog   Waste m3/Ha',
        'Avoidable Grade Y/4 Waste m3/Ha',
        ' Unavoidable  m3/ha',
        'Total Avoidable \nSawlog, Grade 4 \n+ Unavoidable \nWaste m3/Ha',
        'Avoidable Sawlog   Waste m3/Ha',
        'Avoidable Grade Y/4 Waste m3/Ha',
        ' Unavoidable  m3/ha',
        'Total Avoidable \nSawlog, Grade 4 \n+ Unavoidable \nWaste m3/Ha',
      ],
      ['DCC', 2.04, 7.05, 0.08, 9.17, 7.96, 12.93, 0.13, 21.02, 13.5, 15.85, 0.1, 29.45],
    ],
    'Interior',
    ['B1:E1', 'F1:I1', 'J1:M1', 'A1:A2'],
  );
  return bufferToFile(buf, 'interior.xlsx');
}

async function buildCoastFile(): Promise<File> {
  const buf = await buildXlsxBuffer(
    [
      ['District', 'Mature', null, null, null, null, 'Immature', null, null, null, null],
      [
        null,
        'Avoidable Sawlog Full Rate (m3/ha)',
        'Avoidable 0.25 (m3/ha)',
        'Avoidable Grade Y (m3/ha)',
        'Unavoidable Grade Y (m3/ha)',
        'Total All Grades All Class (m3/ha)',
        'Avoidable Sawlog Full Rate (m3/ha)',
        'Avoidable 0.25 (m3/ha)',
        'Avoidable Grade Y (m3/ha)',
        'Unavoidable Grade Y (m3/ha)',
        'Total All Grades All Class (m3/ha)',
      ],
      [
        'DCK - Chilliwack Natural Resource District',
        16.19,
        8.87,
        5.24,
        1.18,
        31.48,
        17.83,
        9.77,
        3.87,
        1.3,
        32.77,
      ],
    ],
    'Coast',
    ['A1:A2', 'B1:F1', 'G1:K1'],
  );
  return bufferToFile(buf, 'coast.xlsx');
}

describe('DistrictVolumeProcessor', () => {
  let processor: DistrictVolumeProcessor;

  beforeEach(() => {
    processor = new DistrictVolumeProcessor();
  });

  it('processes a valid interior spreadsheet', async () => {
    const file = await buildInteriorFile();
    const result = await processor.load(file);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const rows = result.data as TableData[];
    expect(rows).toHaveLength(1);
    const data = rows[0];
    expect(data.type).toBe('INTERIOR');
    if (data.type !== 'INTERIOR') return;

    expect(data.zones).toHaveLength(3);
    const dryBelt = data.zones.find((z) => z.name === 'Dry belt')!;
    expect(dryBelt.districts).toHaveLength(1);
    expect(dryBelt.districts[0].code).toBe('DCC');
    expect(dryBelt.districts[0].avoidableSawlog).toBe(2.04);
    expect(dryBelt.districts[0].avoidableGrade4).toBe(7.05);
    expect(dryBelt.districts[0].unavoidableGrade4).toBe(0.08);
    expect(dryBelt.districts[0].total).toBe(9.17);
  });

  it('processes a valid coast spreadsheet', async () => {
    const file = await buildCoastFile();
    const result = await processor.load(file);

    expect(result.success).toBe(true);
    if (!result.success) return;

    const rows = result.data as TableData[];
    expect(rows).toHaveLength(1);
    const data = rows[0];
    expect(data.type).toBe('COASTAL');
    if (data.type !== 'COASTAL') return;

    expect(data.sections).toHaveLength(2);
    const mature = data.sections.find((s) => s.name === 'Mature')!;
    expect(mature.districts).toHaveLength(1);
    expect(mature.districts[0].code).toBe('DCK');
    expect(mature.districts[0].avoidableSawlog).toBe(16.19);
    expect(mature.districts[0].avoidableHembalGradeU).toBe(8.87);
    expect(mature.districts[0].avoidableGradeY).toBe(5.24);
    expect(mature.districts[0].unavoidable).toBe(1.18);
    expect(mature.districts[0].total).toBe(31.48);
  });

  it('returns failure for corrupt file', async () => {
    const corrupt = new File([new ArrayBuffer(4)], 'bad.xlsx');
    const result = await processor.load(corrupt);
    expect(result.success).toBe(false);
  });

  it('returns failure when spreadsheet has headers but no data rows', async () => {
    const buf = await buildXlsxBuffer(
      [
        ['District', 'Dry Belt', null, null, null],
        [null, 'Avoidable Sawlog', 'Avoidable Grade Y/4', 'Unavoidable', 'Total'],
      ],
      'Interior',
      ['B1:E1'],
    );
    const file = bufferToFile(buf, 'empty-data.xlsx');
    const result = await processor.load(file);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors[0]).toContain('No data rows found');
    }
  });

  it('extracts heli multiplier from coast spreadsheet summary row', async () => {
    const buf = await buildXlsxBuffer(
      [
        ['District', 'Mature', null, null, null, null, 'Immature', null, null, null, null, 'Heli'],
        [
          null,
          'Avoidable Sawlog Full Rate (m3/ha)',
          'Avoidable 0.25 (m3/ha)',
          'Avoidable Grade Y (m3/ha)',
          'Unavoidable Grade Y (m3/ha)',
          'Total All Grades All Class (m3/ha)',
          'Avoidable Sawlog Full Rate (m3/ha)',
          'Avoidable 0.25 (m3/ha)',
          'Avoidable Grade Y (m3/ha)',
          'Unavoidable Grade Y (m3/ha)',
          'Total All Grades All Class (m3/ha)',
          null,
        ],
        [
          'DCK - Chilliwack Natural Resource District',
          16.19,
          8.87,
          5.24,
          1.18,
          31.48,
          17.83,
          9.77,
          3.87,
          1.3,
          32.77,
          null,
        ],
        [
          'Weighted Coast District Average',
          10.0,
          5.0,
          3.0,
          1.0,
          19.0,
          12.0,
          6.0,
          2.0,
          1.0,
          21.0,
          1.25,
        ],
      ],
      'Coast',
      ['A1:A2', 'B1:F1', 'G1:K1'],
    );
    const file = bufferToFile(buf, 'coast-heli.xlsx');
    const result = await processor.load(file);

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(processor.heliMultiplier).toBe(1.25);
  });

  it('returns failure for unsupported format (no Interior/Coast sheet)', async () => {
    const buf = await buildXlsxBuffer([['x']], 'OtherData');
    const file = bufferToFile(buf, 'other.xlsx');
    const result = await processor.load(file);

    expect(result.success).toBe(false);
    if (!result.success && result.errors.length > 0) {
      expect(result.errors[0]).toContain('Could not detect');
    }
  });
});
