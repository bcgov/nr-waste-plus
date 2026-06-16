import { z } from 'zod';

import { col } from '../columnEntry';

import type { SpreadsheetConfig } from '../spreadsheetProcessor';

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

function zoneColumnGroup(zoneName: string, keyPrefix: string, headerPrefix: string) {
  return {
    ...col(
      `${zoneName} m3/ha - Avoidable Sawlog   Waste m3/Ha`,
      `${keyPrefix}AvoidableSawlog`,
      `${headerPrefix} - Avoidable Sawlog`,
    ),
    ...col(
      `${zoneName} m3/ha - Avoidable Grade Y/4 Waste m3/Ha`,
      `${keyPrefix}AvoidableGradeY4`,
      `${headerPrefix} - Grade Y/4`,
    ),
    ...col(
      `${zoneName} m3/ha -  Unavoidable  m3/ha`,
      `${keyPrefix}Unavoidable`,
      `${headerPrefix} - Unavoidable`,
    ),
    ...col(
      `${zoneName} m3/ha - Total Avoidable \r\nSawlog, Grade 4 \r\n+ Unavoidable \r\nWaste m3/Ha`,
      `${keyPrefix}Total`,
      `${headerPrefix} - Total`,
    ),
  };
}

export const interiorConfig: SpreadsheetConfig = {
  sheetName: 'Interior',
  headerRows: 2,
  condensed: false,
  columnMap: {
    ...col('District', 'district', 'District'),
    ...zoneColumnGroup('Dry Belt', 'dryBelt', 'Dry Belt'),
    ...zoneColumnGroup('Transition Zone', 'transitionZone', 'Transition'),
    ...zoneColumnGroup('Wet Belt', 'wetBelt', 'Wet Belt'),
  },
};
