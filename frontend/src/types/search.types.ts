import { z } from 'zod';

import type { Override } from '@/types/utils.types';

/**
 * Code/description pair as serialized by the backend `CodeDescriptionDto`
 * record (`String code, String description, List<String> areas`).
 *
 * All three fields are nullable on the backend (no `@JsonInclude`), and real
 * payloads carry `null` for unresolved lookups — e.g. row status codes. The
 * older hand-written contract claimed non-null strings and drifted from the
 * wire; this schema is the aligned source of truth.
 */
const codeDescriptionSchema = z.object({
  code: z.string().nullable(),
  description: z.string().nullable(),
  areas: z.array(z.string()).nullish(),
});

const searchExpandedSecondarySchema = z.object({
  mark: z.string(),
  status: codeDescriptionSchema,
  // Backend field is a nullable `Double`; the PostgreSQL source sends null.
  area: z.number().nullable(),
});

/**
 * One reporting-unit search-result row.
 *
 * - `id` is a backend-composed string identifying the row (it was missing
 *   from the pre-schema type although always sent).
 * - `lastUpdated` is a Java `LocalDateTime` serialized without an offset but
 *   representing UTC, hence `{ local: true }` rather than the default
 *   `z.iso.datetime()` (which demands a `Z`).
 *
 * Parsed at the boundary in `useSearchReportingUnitsQuery`.
 */
export const reportingUnitSearchResultSchema = z.object({
  id: z.string(),
  wasteAssessmentAreaId: z.int().nullable(),
  cutBlockId: z.string().nullable(),
  ruNumber: z.int(),
  client: codeDescriptionSchema,
  licenseNumber: z.string().nullable(),
  cuttingPermit: z.string().nullable(),
  timberMark: z.string().nullable(),
  multiMark: z.boolean(),
  secondaryEntry: z.boolean(),
  sampling: codeDescriptionSchema,
  district: codeDescriptionSchema,
  status: codeDescriptionSchema,
  lastUpdated: z.iso.datetime({ local: true }),
  bookmarked: z.boolean(),
});

/**
 * Expanded reporting-unit detail for a search row. Parsed at the boundary in
 * `useReportingUnitExpandQuery`.
 */
export const reportingUnitSearchExpandedSchema = z.object({
  id: z.int(),
  licenseNo: z.string().nullable(),
  cuttingPermit: z.string().nullable(),
  timberMark: z.string().nullable(),
  exempted: z.boolean(),
  multiMark: z.boolean(),
  status: codeDescriptionSchema,
  secondaryMarks: z.array(searchExpandedSecondarySchema),
  netArea: z.number(),
  markArea: z.number(),
  submitter: z.string().nullable(),
  attachment: codeDescriptionSchema,
  comments: z.string().nullable(),
  totalBlocks: z.int(),
  totalChildren: z.int(),
});

export type CodeDescriptionDto = z.infer<typeof codeDescriptionSchema>;
export type SearchExpandedSecondaryDto = z.infer<typeof searchExpandedSecondarySchema>;
export type ReportingUnitSearchResultDto = z.infer<typeof reportingUnitSearchResultSchema>;
export type ReportingUnitSearchExpandedDto = z.infer<typeof reportingUnitSearchExpandedSchema>;

/**
 * Parameters for searching and filtering reporting units.
 *
 * Request-side shape built from validated form state and sent as query
 * params; kept a plain type — there is no inbound trust boundary to parse.
 *
 * @property mainSearchTerm - free-text search term
 * @property district - array of district codes to filter by
 * @property sampling - array of sampling methodology codes to filter by
 * @property status - array of status codes to filter by
 * @property requestByMe - filter to show only units requested by the current user
 * @property multiMark - filter to show only units with multiple marks
 * @property bookmarked - filter to show only bookmarked units
 * @property requestUserId - filter by the user ID who requested the unit
 * @property updateDateStart - ISO 8601 start date for filtering by last update
 * @property updateDateEnd - ISO 8601 end date for filtering by last update
 * @property licenseeId - filter by licensee identifier
 * @property cuttingPermitId - filter by cutting permit identifier
 * @property timberMark - filter by timber mark
 * @property clientLocationCode - filter by client location code
 * @property clientNumbers - array of client numbers to filter by
 */
export type ReportingUnitSearchParametersDto = {
  readonly mainSearchTerm?: string;
  readonly district?: string[];
  readonly sampling?: string[];
  readonly status?: string[];
  readonly requestByMe?: boolean;
  readonly multiMark?: boolean;
  readonly bookmarked?: boolean;
  readonly requestUserId?: string;
  readonly updateDateStart?: string;
  readonly updateDateEnd?: string;
  readonly licenseeId?: string;
  readonly cuttingPermitId?: string;
  readonly timberMark?: string;
  readonly clientLocationCode?: string;
  readonly clientNumbers?: string[];
};

/**
 * View-specific overrides for reporting unit search parameters.
 * Allows clientNumbers to be represented as CodeDescriptionDto objects instead of strings.
 *
 * @property clientNumbers - array of client code-description pairs for UI display
 */
export type ReportingUnitSearchParametersViewSpecific = {
  readonly clientNumbers?: CodeDescriptionDto[];
};

/**
 * Merged type combining base search parameters with view-specific overrides.
 * Used for UI forms where clientNumbers are represented as CodeDescriptionDto objects.
 */
export type ReportingUnitSearchParametersViewDto = Override<
  ReportingUnitSearchParametersDto,
  ReportingUnitSearchParametersViewSpecific
>;
