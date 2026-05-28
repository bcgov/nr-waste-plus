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
});

/** TypeScript representation of a reporting unit, inferred from {@link reportingUnitSchema}. */
export type ReportingUnitDto = z.infer<typeof reportingUnitSchema>;

export const reportingUnitCreateRequestSchema = z.object({
  clientNumber: z.string().regex(/^\d{8}$/, 'Client number must be exactly 8 numeric digits'),
  districtCode: z.string().regex(/^[A-Z]{3}$/, 'District code must be exactly 3 uppercase letters'),
  samplingCode: z.string().regex(/^[A-Z]{3}$/, 'Sampling code must be exactly 3 uppercase letters'),
  gradeCode: z.nullable(z.enum(['COST', 'INTERIOR'])),
});

export type ReportingUnitCreateDto = z.infer<typeof reportingUnitCreateRequestSchema>;
