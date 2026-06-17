import type { MatrixConfig } from '@/services/spreadsheet/types';

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
        { header: 'Avoidable Sawlog Full Rate (m3/ha)', key: 'avoidableSawlog' },
        { header: 'Avoidable 0.25 (m3/ha)', key: 'avoidable25' },
        { header: 'Avoidable Grade Y (m3/ha)', key: 'avoidableGradeY' },
        { header: 'Unavoidable Grade Y (m3/ha)', key: 'unavoidable' },
        { header: 'Total All Grades All Class (m3/ha)', key: 'total' },
      ],
    },
    {
      label: 'Immature',
      colStart: 7,
      colEnd: 11,
      subColumns: [
        { header: 'Avoidable Sawlog Full Rate (m3/ha)', key: 'avoidableSawlog' },
        { header: 'Avoidable 0.25 (m3/ha)', key: 'avoidable25' },
        { header: 'Avoidable Grade Y (m3/ha)', key: 'avoidableGradeY' },
        { header: 'Unavoidable Grade Y (m3/ha)', key: 'unavoidable' },
        { header: 'Total All Grades All Class (m3/ha)', key: 'total' },
      ],
    },
  ],
};
