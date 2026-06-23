import type { MatrixConfig } from '@/services/spreadsheet/types';

/**
 * Interior district-averages spreadsheet layout (positional):
 *
 *   Col A  – District code
 *   B–E    – Dry belt    (4 cols: avoidableSawlog / avoidableGrade4 / unavoidableGrade4 / total)
 *   F–I    – Transition zone (same 4-column pattern)
 *   J–M    – Wet belt        (same 4-column pattern)
 *
 * Row 1: merged group labels (Dry belt, Transition zone, Wet belt)
 * Row 2: sub-column labels (not used for validation — layout is positional)
 * Row 3+: data rows (last row is Weighted Average summary)
 */
export const interiorMatrixConfig: MatrixConfig = {
  sheetName: 'Interior',
  headerRows: 2,
  groupHeaderRow: 1,
  columnHeaderRow: 2,
  dataStartRow: 3,
  districtCol: 1,
  districtKey: 'district',
  groupOutputKey: 'zone',
  groups: [
    {
      label: 'Dry belt',
      colStart: 2,
      colEnd: 5,
      subColumns: [
        { key: 'avoidableSawlog', header: 'Avoidable Sawlog' },
        { key: 'avoidableGrade4', header: 'Avoidable Grade Y/4' },
        { key: 'unavoidableGrade4', header: 'Unavoidable' },
        { key: 'total', header: 'Total' },
      ],
    },
    {
      label: 'Transition zone',
      colStart: 6,
      colEnd: 9,
      subColumns: [
        { key: 'avoidableSawlog', header: 'Avoidable Sawlog' },
        { key: 'avoidableGrade4', header: 'Avoidable Grade Y/4' },
        { key: 'unavoidableGrade4', header: 'Unavoidable' },
        { key: 'total', header: 'Total' },
      ],
    },
    {
      label: 'Wet belt',
      colStart: 10,
      colEnd: 13,
      subColumns: [
        { key: 'avoidableSawlog', header: 'Avoidable Sawlog' },
        { key: 'avoidableGrade4', header: 'Avoidable Grade Y/4' },
        { key: 'unavoidableGrade4', header: 'Unavoidable' },
        { key: 'total', header: 'Total' },
      ],
    },
  ],
};
