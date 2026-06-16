import { z } from 'zod';

import type { SpreadsheetConfig } from '../spreadsheetProcessor';

export const coastRowSchema = z.object({
  district: z.string().min(1),
  matureAvoidableSawlog: z.number().nullable(),
  matureAvoidable025: z.number().nullable(),
  matureAvoidableGradeY: z.number().nullable(),
  matureUnavoidableGradeY: z.number().nullable(),
  matureTotal: z.number().nullable(),
  immatureAvoidableSawlog: z.number().nullable(),
  immatureAvoidable025: z.number().nullable(),
  immatureAvoidableGradeY: z.number().nullable(),
  immatureUnavoidableGradeY: z.number().nullable(),
  immatureTotal: z.number().nullable(),
  heliMultiplier: z.unknown().nullable(),
});

export type CoastRow = z.infer<typeof coastRowSchema>;

export const coastConfig: SpreadsheetConfig = {
  sheetName: 'Coast',
  headerRows: 2,
  condensed: false,
  columnMap: {
    'District': { key: 'district', header: 'District' },
    'Mature - Avoidable Sawlog \nFull Rate\n(m3/ha)': {
      key: 'matureAvoidableSawlog',
      header: 'Mature - Avoidable Sawlog',
    },
    'Mature - Avoidable \n0.25\n(m3/ha)': {
      key: 'matureAvoidable025',
      header: 'Mature - Avoidable 0.25',
    },
    'Mature - Avoidable Grade Y (m3/ha)': {
      key: 'matureAvoidableGradeY',
      header: 'Mature - Avoidable Grade Y',
    },
    'Mature - Unavoidable Grade Y\n(m3/ha)': {
      key: 'matureUnavoidableGradeY',
      header: 'Mature - Unavoidable Grade Y',
    },
    'Mature - Total All Grades All Class (m3/ha)': {
      key: 'matureTotal',
      header: 'Mature - Total',
    },
    'Immature - Avoidable Sawlog \nFull Rate\n(m3/ha)': {
      key: 'immatureAvoidableSawlog',
      header: 'Immature - Avoidable Sawlog',
    },
    'Immature - Avoidable \n0.25\n(m3/ha)': {
      key: 'immatureAvoidable025',
      header: 'Immature - Avoidable 0.25',
    },
    'Immature - Avoidable Grade Y (m3/ha)': {
      key: 'immatureAvoidableGradeY',
      header: 'Immature - Avoidable Grade Y',
    },
    'Immature - Unavoidable Grade Y\n(m3/ha)': {
      key: 'immatureUnavoidableGradeY',
      header: 'Immature - Unavoidable Grade Y',
    },
    'Immature - Total All Grades All Class (m3/ha)': {
      key: 'immatureTotal',
      header: 'Immature - Total',
    },
    'Heli Mulitplier': { key: 'heliMultiplier', header: 'Heli Multiplier' },
    'Heli Multiplier': { key: 'heliMultiplier', header: 'Heli Multiplier' },
  },
};
