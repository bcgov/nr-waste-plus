import type { MatrixConfig } from '@/services/spreadsheet/types';

/**
 * Coast district-averages spreadsheet layout (positional):
 *
 *   Col A  – District code
 *   B–F    – Mature     (5 cols: avoidableSawlog / avoidableHembalGradeU / avoidableGradeY / unavoidable / total)
 *   G–K    – Immature   (same 5-column pattern)
 *   L      – Heli Multiplier (standalone value in last summary row)
 *
 * Row 1: merged group labels (Mature, Immature) + Heli Mulitplier header
 * Row 2: sub-column labels with embedded newlines (not used for validation — layout is positional)
 * Row 3+: data rows (last row is Weighted Average summary with heli multiplier in col L)
 */
export const coastMatrixConfig: MatrixConfig = {
  sheetName: 'Coast',
  headerRows: 2,
  groupHeaderRow: 1,
  columnHeaderRow: 2,
  dataStartRow: 3,
  districtCol: 1,
  districtKey: 'district',
  groupOutputKey: 'section',
  groups: [
    {
      label: 'Mature',
      colStart: 2,
      colEnd: 6,
      subColumns: [
        { key: 'avoidableSawlog' },
        { key: 'avoidableHembalGradeU' },
        { key: 'avoidableGradeY' },
        { key: 'unavoidable' },
        { key: 'total' },
      ],
    },
    {
      label: 'Immature',
      colStart: 7,
      colEnd: 11,
      subColumns: [
        { key: 'avoidableSawlog' },
        { key: 'avoidableHembalGradeU' },
        { key: 'avoidableGradeY' },
        { key: 'unavoidable' },
        { key: 'total' },
      ],
    },
  ],
};
