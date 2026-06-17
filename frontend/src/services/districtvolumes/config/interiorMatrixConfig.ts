import type { MatrixConfig } from '@/services/spreadsheet/types';

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
        { header: 'Avoidable Sawlog Waste m3/Ha', key: 'avoidableSawlog' },
        { header: 'Avoidable Grade Y/4 Waste m3/Ha', key: 'avoidableGradeY4' },
        { header: 'Unavoidable m3/ha', key: 'unavoidable' },
        { header: 'Total Avoidable Sawlog, Grade 4 + Unavoidable Waste m3/Ha', key: 'total' },
      ],
    },
    {
      label: 'Transition zone',
      colStart: 6,
      colEnd: 9,
      subColumns: [
        { header: 'Avoidable Sawlog Waste m3/Ha', key: 'avoidableSawlog' },
        { header: 'Avoidable Grade Y/4 Waste m3/Ha', key: 'avoidableGradeY4' },
        { header: 'Unavoidable m3/ha', key: 'unavoidable' },
        { header: 'Total Avoidable Sawlog, Grade 4 + Unavoidable Waste m3/Ha', key: 'total' },
      ],
    },
    {
      label: 'Wet belt',
      colStart: 10,
      colEnd: 13,
      subColumns: [
        { header: 'Avoidable Sawlog Waste m3/Ha', key: 'avoidableSawlog' },
        { header: 'Avoidable Grade Y/4 Waste m3/Ha', key: 'avoidableGradeY4' },
        { header: 'Unavoidable m3/ha', key: 'unavoidable' },
        { header: 'Total Avoidable Sawlog, Grade 4 + Unavoidable Waste m3/Ha', key: 'total' },
      ],
    },
  ],
};
