import { z } from 'zod';

import {
  districtVolumeDetailBaseSchema,
  districtVolumeListItemSchema,
} from '@/types/districtvolumes.types';
import { codeDescriptionSchema } from '@/types/search.types';

/** The species codes used in the spreadsheet and API. */
export const SPECIES_COLUMNS = [
  'AL',
  'AR',
  'AS',
  'BA',
  'BI',
  'CE',
  'CO',
  'CY',
  'FI',
  'HE',
  'LA',
  'LO',
  'MA',
  'OT',
  'R',
  'SP',
  'UU',
  'WA',
  'WB',
  'WH',
  'WI',
  'YE',
] as const;

export type SpeciesKey = (typeof SPECIES_COLUMNS)[number];

/** Display labels for species columns, keyed by {@link SpeciesKey}. */
export const SPECIES_LABELS: Record<SpeciesKey, string> = {
  AL: 'AL',
  AR: 'AR',
  AS: 'AS',
  BA: 'BA',
  BI: 'BI',
  CE: 'CE',
  CO: 'CO',
  CY: 'CY',
  FI: 'FI',
  HE: 'HE',
  LA: 'LA',
  LO: 'LO',
  MA: 'MA',
  OT: 'OT',
  R: 'R',
  SP: 'SP',
  UU: 'UU',
  WA: 'WA',
  WB: 'WB',
  WH: 'WH',
  WI: 'WI',
  YE: 'YE',
};

/** Full species names for tooltip display, keyed by {@link SpeciesKey}. */
export const SPECIES_DESCRIPTIONS: Record<SpeciesKey, string> = {
  AL: 'Alder',
  AR: 'Arbutus',
  AS: 'Aspen',
  BA: 'Balsam',
  BI: 'Birch',
  CE: 'Cedar',
  CO: 'Cottonwood',
  CY: 'Cypress',
  FI: 'Fir',
  HE: 'Hemlock',
  LA: 'Larch',
  LO: 'Lodge-Pine',
  MA: 'Maple',
  OT: 'Other Species',
  R: 'Rejects',
  SP: 'Spruce',
  UU: 'Yew',
  WA: 'Waste',
  WB: 'White Bark Pine',
  WH: 'White Pine',
  WI: 'Willow',
  YE: 'Yellow Pine',
};

/**
 * One district × species row, mirroring the backend `SpeciesCompositionRow`
 * record. Both fields are `@JsonInclude(NON_NULL)`, so the keys are absent
 * (not null) when unresolved; `species` mirrors the backend's open
 * `Map<String, BigDecimal>` (arbitrary species codes as keys).
 */
const speciesCompositionRowSchema = z.object({
  district: codeDescriptionSchema.nullish(),
  species: z.record(z.string(), z.number()).nullish(),
});

const speciesCompositionDataSchema = z.object({
  rows: z.array(speciesCompositionRowSchema).nullish(),
});

/**
 * The species-composition variant of the polymorphic `TableDataDto` wire
 * envelope — the `type` discriminator selects the subtype on the wire.
 */
const speciesCompositionTableDataSchema = speciesCompositionDataSchema.extend({
  type: z.literal('SPECIES_COMPOSITION'),
});

/**
 * List item as serialized by the shared `DistrictVolumeListItemDto` record —
 * the species composition endpoints reuse the district volume DTOs verbatim,
 * so the schema is the district volume one. Exported for page-envelope
 * composition at the query boundary.
 */
export const speciesCompositionListItemSchema = districtVolumeListItemSchema;

/**
 * Detail as serialized by the shared `DistrictVolumeDetailDto` record:
 * `heliMultiplier` is COASTAL-only and omitted (`NON_NULL`) for INTERIOR
 * rows, and `tableData` carries the `SPECIES_COMPOSITION` discriminator.
 *
 * Parsed at the boundary in `useSpeciesCompositionDetailQuery`.
 */
export const speciesCompositionDetailSchema = districtVolumeDetailBaseSchema.extend({
  heliMultiplier: z.number().optional(),
  tableData: speciesCompositionTableDataSchema,
});

/**
 * Create request body as accepted by the shared `DistrictVolumeCreateDto`
 * record (outgoing, client-constructed — never parsed).
 */
export interface SpeciesCompositionCreate {
  area: 'INTERIOR' | 'COASTAL';
  startDate: string;
  tableLevelFactor: number;
  heliMultiplier: number | null;
  tableData: {
    type: 'SPECIES_COMPOSITION';
    rows: SpeciesCompositionRow[];
  };
}

export type SpeciesCompositionData = z.infer<typeof speciesCompositionDataSchema>;
export type SpeciesCompositionRow = NonNullable<SpeciesCompositionData['rows']>[number];
export type SpeciesCompositionListItem = z.infer<typeof speciesCompositionListItemSchema>;
export type SpeciesCompositionDetail = z.infer<typeof speciesCompositionDetailSchema>;
