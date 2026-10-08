import { z } from 'zod';

import { pageableResponseSchema } from '@/components/Form/TableResource/schemas';

// ─── INTERIOR SUB-SCHEMAS ────────────────────────────────────────────────────
export const interiorDistrictRowSchema = z.object({
  code: z.string(), // Maps to CodeDescriptionDto on the backend during pipeline conversion
  avoidableSawlog: z.number(),
  avoidableGrade4: z.number(),
  unavoidableGrade4: z.number(),
  total: z.number(),
});
export type InteriorDistrictRow = z.infer<typeof interiorDistrictRowSchema>;

export const interiorZoneSchema = z.object({
  name: z.enum(['Dry belt', 'Transition zone', 'Wet belt']),
  districts: z.array(interiorDistrictRowSchema),
});
export type InteriorZone = z.infer<typeof interiorZoneSchema>;

export const interiorDataSchema = z.object({
  type: z.literal('INTERIOR'),
  zones: z.array(interiorZoneSchema),
  formulas: z.record(z.string(), z.unknown()).default({}),
});
export type InteriorData = z.infer<typeof interiorDataSchema>;

// ─── COASTAL SUB-SCHEMAS ─────────────────────────────────────────────────────
export const coastDistrictRowSchema = z.object({
  code: z.string(),
  avoidableSawlog: z.number(),
  avoidableHembalGradeU: z.number(),
  avoidableGradeY: z.number(),
  unavoidable: z.number(),
  total: z.number(),
});
export type CoastDistrictRow = z.infer<typeof coastDistrictRowSchema>;

export const coastSectionSchema = z.object({
  name: z.enum(['Mature', 'Immature']),
  districts: z.array(coastDistrictRowSchema),
});
export type CoastSection = z.infer<typeof coastSectionSchema>;

export const coastDataSchema = z.object({
  type: z.literal('COASTAL'),
  sections: z.array(coastSectionSchema),
  formulas: z.record(z.string(), z.unknown()).default({}),
});
export type CoastData = z.infer<typeof coastDataSchema>;

// ─── POLYMORPHIC TABLE DATA UNION ────────────────────────────────────────────
export const tableDataSchema = z.discriminatedUnion('type', [interiorDataSchema, coastDataSchema]);
export type TableData = z.infer<typeof tableDataSchema>;

// ─── LIST RESPONSE SCHEMAS ───────────────────────────────────────────────────
export const districtVolumeListItemSchema = z.object({
  id: z.number(),
  area: z.enum(['INTERIOR', 'COASTAL']),
  startDate: z.string(), // ISO Date string
  endDate: z.string().nullable(),
  uploadedBy: z.string(),
  dateOfUpload: z.string(), // ISO Timestamp string
});
export type DistrictVolumeListItem = z.infer<typeof districtVolumeListItemSchema>;

export const districtVolumeListResponseSchema = pageableResponseSchema(
  districtVolumeListItemSchema,
);
export type DistrictVolumeListResponse = z.infer<typeof districtVolumeListResponseSchema>;

// ─── DETAIL RESPONSE SCHEMA (DISCRIMINATED UNION) ───────────────────────────
const detailBaseSchema = {
  id: z.number(),
  startDate: z.string(),
  endDate: z.string().nullable(),
  uploadedBy: z.string(),
  dateOfUpload: z.string(),
  tableLevelFactor: z.number(),
};

export const districtVolumeDetailSchema = z.discriminatedUnion('area', [
  z.object({
    ...detailBaseSchema,
    area: z.literal('INTERIOR'),
    tableData: interiorDataSchema,
  }),
  z.object({
    ...detailBaseSchema,
    area: z.literal('COASTAL'),
    tableData: coastDataSchema,
    heliMultiplier: z.number(), // Required only for COASTAL
  }),
]);
export type DistrictVolumeDetail = z.infer<typeof districtVolumeDetailSchema>;

// ─── CREATE REQUEST SCHEMA (DISCRIMINATED UNION) ─────────────────────────────
export const districtVolumeCreateSchema = z.discriminatedUnion('area', [
  z.object({
    area: z.literal('INTERIOR'),
    startDate: z.string(), // ISO-8601 string (> today validated server-side)
    tableLevelFactor: z.number(),
    tableData: interiorDataSchema,
  }),
  z.object({
    area: z.literal('COASTAL'),
    startDate: z.string(),
    tableLevelFactor: z.number(),
    heliMultiplier: z.number().positive(),
    tableData: coastDataSchema,
  }),
]);
export type DistrictVolumeCreate = z.infer<typeof districtVolumeCreateSchema>;
