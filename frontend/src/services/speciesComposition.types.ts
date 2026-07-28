import { z } from 'zod';

import { codeDescriptionSchema } from './reportingUnit.types';

import { pageableResponseSchema } from '@/components/Form/TableResource/schemas';

// ─── SPECIES COLUMN KEYS ─────────────────────────────────────────────────────
/** The 19 abbreviated species codes used in the spreadsheet and API. */
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
  'SP',
  'UU',
  'WB',
  'WH',
  'WI',
  'YE',
] as const;

export type SpeciesKey = (typeof SPECIES_COLUMNS)[number];

// ─── SPECIES COLUMN LABELS ──────────────────────────────────────────────────
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
  SP: 'SP',
  UU: 'UU',
  WB: 'WB',
  WH: 'WH',
  WI: 'WI',
  YE: 'YE',
};

// ─── ROW ─────────────────────────────────────────────────────────────────────
export const speciesCompositionRowSchema = z.object({
  district: codeDescriptionSchema,
  species: z.record(z.string(), z.number()),
});
export type SpeciesCompositionRow = z.infer<typeof speciesCompositionRowSchema>;

// ─── DATA CONTAINER ──────────────────────────────────────────────────────────
export const speciesCompositionDataSchema = z.object({
  rows: z.array(speciesCompositionRowSchema),
});
export type SpeciesCompositionData = z.infer<typeof speciesCompositionDataSchema>;

// ─── LIST ITEM SCHEMA ────────────────────────────────────────────────────────
export const speciesCompositionListItemSchema = z.object({
  id: z.number(),
  startDate: z.string(), // ISO Date string
  endDate: z.string().nullable(),
  uploadedBy: z.string(),
  dateOfUpload: z.string(), // ISO Timestamp string
});
export type SpeciesCompositionListItem = z.infer<typeof speciesCompositionListItemSchema>;

export const speciesCompositionListResponseSchema = pageableResponseSchema(
  speciesCompositionListItemSchema,
);
export type SpeciesCompositionListResponse = z.infer<typeof speciesCompositionListResponseSchema>;

// ─── DETAIL SCHEMA ───────────────────────────────────────────────────────────
export const speciesCompositionDetailSchema = z.object({
  id: z.number(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  uploadedBy: z.string(),
  dateOfUpload: z.string(),
  tableData: speciesCompositionDataSchema,
});
export type SpeciesCompositionDetail = z.infer<typeof speciesCompositionDetailSchema>;

// ─── CREATE REQUEST SCHEMA ───────────────────────────────────────────────────
export const speciesCompositionCreateSchema = z.object({
  area: z.string(),
  startDate: z.string(),
  tableLevelFactor: z.number(),
  heliMultiplier: z.number().nullable(),
  tableData: z.object({
    type: z.literal('SPECIES_COMPOSITION'),
    rows: z.array(speciesCompositionRowSchema),
  }),
});
export type SpeciesCompositionCreate = z.infer<typeof speciesCompositionCreateSchema>;
