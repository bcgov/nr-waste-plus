import { z } from 'zod';

import { pageableResponseSchema } from '@/components/Form/TableResource/schemas';

// ─── SPECIES COLUMN KEYS ─────────────────────────────────────────────────────
export const SPECIES_COLUMNS = [
  'balsam',
  'cedar',
  'cottonwood',
  'cypress',
  'fir',
  'hemlock',
  'larch',
  'maple',
  'pine',
  'poplar',
  'redcedar',
  'redwood',
  'spruce',
  'whitebirch',
  'whitepine',
  'yew',
  'other',
  'unknown',
  'total',
] as const;

export type SpeciesKey = (typeof SPECIES_COLUMNS)[number];

// ─── CODE DESCRIPTION ────────────────────────────────────────────────────────
export const codeDescriptionSchema = z.object({
  code: z.string(),
  description: z.string(),
});
export type CodeDescriptionDto = z.infer<typeof codeDescriptionSchema>;

// ─── ROW ─────────────────────────────────────────────────────────────────────
export const speciesCompositionRowSchema = z.object({
  district: codeDescriptionSchema,
  balsam: z.number(),
  cedar: z.number(),
  cottonwood: z.number(),
  cypress: z.number(),
  fir: z.number(),
  hemlock: z.number(),
  larch: z.number(),
  maple: z.number(),
  pine: z.number(),
  poplar: z.number(),
  redcedar: z.number(),
  redwood: z.number(),
  spruce: z.number(),
  whitebirch: z.number(),
  whitepine: z.number(),
  yew: z.number(),
  other: z.number(),
  unknown: z.number(),
  total: z.number(),
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
  tableData: speciesCompositionDataSchema,
});
export type SpeciesCompositionCreate = z.infer<typeof speciesCompositionCreateSchema>;
