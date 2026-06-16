import { z } from 'zod';

import { col } from '../columnEntry';

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

function columnGroup(prefix: string, keyPrefix: string) {
  return {
    ...col(
      `${prefix} - Avoidable Sawlog \nFull Rate\n(m3/ha)`,
      `${keyPrefix}AvoidableSawlog`,
      `${prefix} - Avoidable Sawlog`,
    ),
    ...col(
      `${prefix} - Avoidable \n0.25\n(m3/ha)`,
      `${keyPrefix}Avoidable025`,
      `${prefix} - Avoidable 0.25`,
    ),
    ...col(
      `${prefix} - Avoidable Grade Y (m3/ha)`,
      `${keyPrefix}AvoidableGradeY`,
      `${prefix} - Avoidable Grade Y`,
    ),
    ...col(
      `${prefix} - Unavoidable Grade Y\n(m3/ha)`,
      `${keyPrefix}UnavoidableGradeY`,
      `${prefix} - Unavoidable Grade Y`,
    ),
    ...col(
      `${prefix} - Total All Grades All Class (m3/ha)`,
      `${keyPrefix}Total`,
      `${prefix} - Total`,
    ),
  };
}

export const coastConfig: SpreadsheetConfig = {
  sheetName: 'Coast',
  headerRows: 2,
  condensed: false,
  columnMap: {
    ...col('District', 'district', 'District'),
    ...columnGroup('Mature', 'mature'),
    ...columnGroup('Immature', 'immature'),
    ...col('Heli Mulitplier', 'heliMultiplier', 'Heli Multiplier'),
    ...col('Heli Multiplier', 'heliMultiplier', 'Heli Multiplier'),
  },
};
