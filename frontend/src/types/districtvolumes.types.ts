import { z } from 'zod';

import { uploadAuditSchema } from '@/types/audit.types';

/**
 * Interior district row as serialized by `InteriorDistrictRowDto`
 * (BigDecimal values become numbers).
 */
const interiorDistrictRowSchema = z.object({
  code: z.string(), // Maps to CodeDescriptionDto on the backend during pipeline conversion
  avoidableSawlog: z.number(),
  avoidableGrade4: z.number(),
  unavoidableGrade4: z.number(),
  total: z.number(),
});

const interiorZoneSchema = z.object({
  name: z.enum(['Dry belt', 'Transition zone', 'Wet belt']),
  districts: z.array(interiorDistrictRowSchema),
});

const interiorDataSchema = z.object({
  type: z.literal('INTERIOR'),
  zones: z.array(interiorZoneSchema),
  formulas: z.record(z.string(), z.unknown()).default({}),
});

/**
 * Coast district row as serialized by `CoastDistrictRowDto`.
 */
const coastDistrictRowSchema = z.object({
  code: z.string(),
  avoidableSawlog: z.number(),
  avoidableHembalGradeU: z.number(),
  avoidableGradeY: z.number(),
  unavoidable: z.number(),
  total: z.number(),
});

const coastSectionSchema = z.object({
  name: z.enum(['Mature', 'Immature']),
  districts: z.array(coastDistrictRowSchema),
});

const coastDataSchema = z.object({
  type: z.literal('COASTAL'),
  sections: z.array(coastSectionSchema),
  formulas: z.record(z.string(), z.unknown()).default({}),
});

/**
 * The district-average table-data variants of the polymorphic
 * `TableDataDto` wire envelope (the SPECIES_COMPOSITION variant is owned by
 * the species composition schemas).
 */

/**
 * List item as serialized by the shared `DistrictVolumeListItemDto` record
 * (also the species composition list item). `startDate`/`endDate` are
 * `LocalDate` values; `dateOfUpload` is an `Instant`.
 *
 * Exported for page-envelope composition at the query boundary.
 */
export const districtVolumeListItemSchema = uploadAuditSchema.extend({
  id: z.int(),
  area: z.enum(['INTERIOR', 'COASTAL']),
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable(),
});

/**
 * Detail fields shared by every configuration detail response
 * (`DistrictVolumeDetailDto`) regardless of table-data variant. Exported as
 * the building block the species composition detail composes.
 */
export const districtVolumeDetailBaseSchema = uploadAuditSchema.extend({
  id: z.int(),
  area: z.enum(['INTERIOR', 'COASTAL']),
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable(),
  tableLevelFactor: z.number(),
});

/**
 * Detail response discriminated by `area`: INTERIOR rows carry zone data,
 * COASTAL rows carry section data plus the service-validated
 * `heliMultiplier`.
 *
 * Parsed at the boundary in `useDistrictVolumeTableDetailQuery`.
 */
export const districtVolumeDetailSchema = z.discriminatedUnion('area', [
  z.object({
    ...districtVolumeDetailBaseSchema.shape,
    area: z.literal('INTERIOR'),
    tableData: interiorDataSchema,
  }),
  z.object({
    ...districtVolumeDetailBaseSchema.shape,
    area: z.literal('COASTAL'),
    tableData: coastDataSchema,
    heliMultiplier: z.number(), // Required only for COASTAL
  }),
]);

/**
 * Create request body as accepted by the shared `DistrictVolumeCreateDto`
 * record (outgoing, client-constructed from validated form state — never
 * parsed, hence a plain type). `startDate` must be strictly after today,
 * validated server-side.
 */
export type DistrictVolumeCreate =
  | {
      area: 'INTERIOR';
      startDate: string;
      tableLevelFactor: number;
      tableData: InteriorData;
    }
  | {
      area: 'COASTAL';
      startDate: string;
      tableLevelFactor: number;
      heliMultiplier: number;
      tableData: CoastData;
    };

export type InteriorDistrictRow = z.infer<typeof interiorDistrictRowSchema>;
export type InteriorZone = z.infer<typeof interiorZoneSchema>;
export type InteriorData = z.infer<typeof interiorDataSchema>;
export type CoastDistrictRow = z.infer<typeof coastDistrictRowSchema>;
export type CoastSection = z.infer<typeof coastSectionSchema>;
export type CoastData = z.infer<typeof coastDataSchema>;
export type TableData = InteriorData | CoastData;
export type DistrictVolumeListItem = z.infer<typeof districtVolumeListItemSchema>;
export type DistrictVolumeDetail = z.infer<typeof districtVolumeDetailSchema>;
