import { z } from 'zod';

/**
 * Zod schema for a code/description pair returned by the backend.
 *
 * Both `code` and `description` can be `null` when the backend returns an
 * unresolved reference. Use loose-object parsing to tolerate extra backend fields.
 */
export const codeDescriptionSchema = z.looseObject({
  code: z.nullable(z.string()),
  description: z.nullable(z.string()),
});

/**
 * Zod schema for the full reporting-unit details response.
 *
 * Used in {@link ReportingUnitService.getReportingUnit} to validate the API
 * response at runtime and surface unexpected shape changes early.
 */
export const reportingUnitSchema = z.looseObject({
  id: z.number(),
  client: codeDescriptionSchema,
  clientStatus: codeDescriptionSchema,
  grade: codeDescriptionSchema,
  sampling: codeDescriptionSchema,
  district: codeDescriptionSchema,
  // Creation timestamp; optional because older payloads (and the read-only
  // block details view) may omit it, in which case the UI falls back to a placeholder.
  createdAt: z.optional(z.nullable(z.string())),
  /**
   * Block-creation rule for this reporting unit, derived server-side from the
   * per-sampling-type configuration. `undefined` (absent) means the backend has
   * not shipped the rule yet — the UI falls back to its temporary client-side
   * rule table; once present, this value replaces all client-side rules.
   */
  blockRule: z.optional(
    z.object({
      maxBlocks: z.number(),
      blockType: z.literal('DISTRICT_AVERAGE'),
    }),
  ),
  /**
   * Whether this reporting unit only exists in the legacy (Oracle) system.
   * Optional until the backend ships it; the UI falls back to the grade-based
   * heuristic (`!grade?.code`) while absent.
   */
  isLegacy: z.optional(z.boolean()),
});

/** TypeScript representation of a reporting unit, inferred from {@link reportingUnitSchema}. */
export type ReportingUnitDto = z.infer<typeof reportingUnitSchema>;

export const reportingUnitCreateRequestSchema = z.object({
  clientNumber: z.string().regex(/^\d{8}$/, 'Client number must be exactly 8 numeric digits'),
  districtCode: z.string().regex(/^[A-Z]{3}$/, 'District code must be exactly 3 uppercase letters'),
  samplingCode: z.string().regex(/^[A-Z]{3}$/, 'Sampling code must be exactly 3 uppercase letters'),
  gradeCode: z.nullable(z.enum(['COASTAL', 'INTERIOR'])),
});

export type ReportingUnitCreateDto = z.infer<typeof reportingUnitCreateRequestSchema>;

/**
 * Zod schema for the block-creation request body (issue #1228).
 *
 * First release supports only District Average blocks, matching the
 * one-block-per-Reporting-Unit domain constraint.
 */
export const blockCreateRequestSchema = z.object({
  blockType: z.literal('DISTRICT_AVERAGE'),
});

/** TypeScript representation of a block-creation request. */
export type BlockCreateRequestDto = z.infer<typeof blockCreateRequestSchema>;

/**
 * Zod schema for the block-creation response body (issue #1228 contract).
 *
 * The backend responds with the full block resource: a newly created block
 * starts in the `DRAFT` state. Use loose-object parsing so future backend
 * fields do not break validation.
 */
export const blockCreateResponseSchema = z.looseObject({
  id: z.number(),
  reportingUnitId: z.number(),
  blockType: z.string(),
  state: z.string(),
  version: z.number(),
  createdAt: z.nullable(z.string()),
  updatedAt: z.nullable(z.string()),
});

/** TypeScript representation of a block-creation response. */
export type BlockCreateResponseDto = z.infer<typeof blockCreateResponseSchema>;

/**
 * Zod schema for the block-details response
 * (`GET /api/reporting-units/{reportingUnitId}/{blockId}`).
 *
 * `blockType`, `plcDate`, and `revision` are nullable because the backend
 * cannot resolve them for every block. `isLegacy` marks blocks served from
 * the legacy system. Use loose-object parsing so future backend fields do
 * not break validation.
 */
export const blockDetailsSchema = z.looseObject({
  id: z.number(),
  reportingUnitId: z.number(),
  blockType: z.nullable(z.string()),
  draft: z.boolean(),
  plcDate: z.nullable(z.string()),
  revision: z.nullable(z.number()),
  isLegacy: z.boolean(),
});

/** TypeScript representation of a block-details response. */
export type BlockDetailsDto = z.infer<typeof blockDetailsSchema>;
