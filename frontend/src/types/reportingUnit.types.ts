import { z } from 'zod';

import { codeDescriptionSchema } from '@/types/search.types';

/**
 * Reporting-unit details response as serialized by
 * `ReportingUnitDetailsDto` (`id` is a `Long`; every field except `id` is
 * `@JsonInclude(NON_NULL)`, so `blockRule`/`isLegacy` keys are absent until
 * the backend ships them). The record carries no creation timestamp.
 *
 * Parsed at the boundary in `ReportingUnitService.getReportingUnit`.
 */
export const reportingUnitSchema = z.looseObject({
  id: z.int(),
  client: codeDescriptionSchema,
  clientStatus: codeDescriptionSchema,
  grade: codeDescriptionSchema,
  sampling: codeDescriptionSchema,
  district: codeDescriptionSchema,
  /**
   * Block-creation rule for this reporting unit, derived server-side from the
   * per-sampling-type configuration. `undefined` (absent) means the backend has
   * not shipped the rule yet — the UI falls back to its temporary client-side
   * rule table; once present, this value replaces all client-side rules. The
   * backend `blockType` is a `String` field, but the #1228 first-release
   * contract only ever produces `DISTRICT_AVERAGE` — the literal is what the
   * block-creation POST requires, and a boundary-parse failure on anything
   * else is the wanted early warning.
   */
  blockRule: z.optional(
    z.object({
      maxBlocks: z.int(),
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

/**
 * Reporting-unit creation request body (outgoing, form-validated — the
 * 8-digit/3-letter regexes mirror the backend `@Pattern` constraints).
 */
export const reportingUnitCreateRequestSchema = z.object({
  clientNumber: z.string().regex(/^\d{8}$/, 'Client number must be exactly 8 numeric digits'),
  districtCode: z.string().regex(/^[A-Z]{3}$/, 'District code must be exactly 3 uppercase letters'),
  samplingCode: z.string().regex(/^[A-Z]{3}$/, 'Sampling code must be exactly 3 uppercase letters'),
  gradeCode: z.nullable(z.enum(['COASTAL', 'INTERIOR'])),
});

export type ReportingUnitCreateDto = z.infer<typeof reportingUnitCreateRequestSchema>;

/**
 * Block-creation request body (issue #1228).
 *
 * First release supports only District Average blocks, matching the
 * one-block-per-Reporting-Unit domain constraint. `expectedReportingUnitState`
 * is the optimistic precondition required by the #1228 contract: the reporting
 * unit must still be in `SUBMISSION` when the block is created.
 */
export const blockCreateRequestSchema = z.object({
  blockType: z.literal('DISTRICT_AVERAGE'),
  expectedReportingUnitState: z.literal('SUBMISSION'),
});

/** TypeScript representation of a block-creation request. */
export type BlockCreateRequestDto = z.infer<typeof blockCreateRequestSchema>;

/**
 * Block-creation response body (issue #1228 contract).
 *
 * The backend responds with the full block resource: a newly created block
 * starts in the `DRAFT` state. Until the endpoint ships, the service returns
 * a frontend stub shaped by this schema — parsing it at the boundary keeps
 * the stub contract-honest. Loose-object parsing tolerates future backend
 * fields.
 */
export const blockCreateResponseSchema = z.looseObject({
  id: z.int(),
  reportingUnitId: z.int(),
  blockType: z.string(),
  state: z.string(),
  version: z.int(),
  createdAt: z.iso.datetime().nullable(),
  updatedAt: z.iso.datetime().nullable(),
});

/** TypeScript representation of a block-creation response. */
export type BlockCreateResponseDto = z.infer<typeof blockCreateResponseSchema>;

/**
 * Block-details response
 * (`GET /api/reporting-units/{reportingUnitId}/{blockId}`, Java
 * `BlockDetailDto`).
 *
 * `blockType`, `plcDate`, and `revision` are nullable because the backend
 * cannot resolve them for every block (`plcDate` is a `LocalDate`).
 * `isLegacy` marks blocks served from the legacy system. Loose-object
 * parsing tolerates future backend fields.
 *
 * Parsed at the boundary in `ReportingUnitService.getBlockDetails`.
 */
export const blockDetailsSchema = z.looseObject({
  id: z.int(),
  reportingUnitId: z.int(),
  blockType: z.nullable(z.string()),
  draft: z.boolean(),
  plcDate: z.iso.date().nullable(),
  revision: z.nullable(z.int()),
  isLegacy: z.boolean(),
});

/** TypeScript representation of a block-details response. */
export type BlockDetailsDto = z.infer<typeof blockDetailsSchema>;
