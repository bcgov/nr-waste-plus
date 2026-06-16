import { z } from 'zod';

import type { SpreadsheetConfig } from '../spreadsheetProcessor';

// ---------------------------------------------------------------------------
// Typed schema for the Interior district-averages spreadsheet
// ---------------------------------------------------------------------------

export const interiorRowSchema = z.object({
  district: z.string().min(1),
  dryBeltAvoidableSawlog: z.number().nullable(),
  dryBeltAvoidableGradeY4: z.number().nullable(),
  dryBeltUnavoidable: z.number().nullable(),
  dryBeltTotal: z.number().nullable(),
  transitionZoneAvoidableSawlog: z.number().nullable(),
  transitionZoneAvoidableGradeY4: z.number().nullable(),
  transitionZoneUnavoidable: z.number().nullable(),
  transitionZoneTotal: z.number().nullable(),
  wetBeltAvoidableSawlog: z.number().nullable(),
  wetBeltAvoidableGradeY4: z.number().nullable(),
  wetBeltUnavoidable: z.number().nullable(),
  wetBeltTotal: z.number().nullable(),
});

export type InteriorRow = z.infer<typeof interiorRowSchema>;

export const interiorConfig: SpreadsheetConfig = {
  sheetName: 'Interior',
  headerRows: 2,
  condensed: false,
  columnMap: {
    'District': { key: 'district', header: 'District' },
    'Dry Belt m3/ha - Avoidable Sawlog   Waste m3/Ha': {
      key: 'dryBeltAvoidableSawlog',
      header: 'Dry Belt - Avoidable Sawlog',
    },
    'Dry Belt m3/ha - Avoidable Grade Y/4 Waste m3/Ha': {
      key: 'dryBeltAvoidableGradeY4',
      header: 'Dry Belt - Grade Y/4',
    },
    'Dry Belt m3/ha -  Unavoidable  m3/ha': {
      key: 'dryBeltUnavoidable',
      header: 'Dry Belt - Unavoidable',
    },
    'Dry Belt m3/ha - Total Avoidable \r\nSawlog, Grade 4 \r\n+ Unavoidable \r\nWaste m3/Ha': {
      key: 'dryBeltTotal',
      header: 'Dry Belt - Total',
    },
    'Transition Zone m3/ha - Avoidable Sawlog   Waste m3/Ha': {
      key: 'transitionZoneAvoidableSawlog',
      header: 'Transition - Avoidable Sawlog',
    },
    'Transition Zone m3/ha - Avoidable Grade Y/4 Waste m3/Ha': {
      key: 'transitionZoneAvoidableGradeY4',
      header: 'Transition - Grade Y/4',
    },
    'Transition Zone m3/ha -  Unavoidable  m3/ha': {
      key: 'transitionZoneUnavoidable',
      header: 'Transition - Unavoidable',
    },
    'Transition Zone m3/ha - Total Avoidable \r\nSawlog, Grade 4 \r\n+ Unavoidable \r\nWaste m3/Ha':
      {
        key: 'transitionZoneTotal',
        header: 'Transition - Total',
      },
    'Wet Belt m3/ha - Avoidable Sawlog   Waste m3/Ha': {
      key: 'wetBeltAvoidableSawlog',
      header: 'Wet Belt - Avoidable Sawlog',
    },
    'Wet Belt m3/ha - Avoidable Grade Y/4 Waste m3/Ha': {
      key: 'wetBeltAvoidableGradeY4',
      header: 'Wet Belt - Grade Y/4',
    },
    'Wet Belt m3/ha -  Unavoidable  m3/ha': {
      key: 'wetBeltUnavoidable',
      header: 'Wet Belt - Unavoidable',
    },
    'Wet Belt m3/ha - Total Avoidable \r\nSawlog, Grade 4 \r\n+ Unavoidable \r\nWaste m3/Ha': {
      key: 'wetBeltTotal',
      header: 'Wet Belt - Total',
    },
  },
};
