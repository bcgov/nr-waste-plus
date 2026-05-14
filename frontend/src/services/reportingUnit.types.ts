import { z } from 'zod';

export const codeDescriptionSchema = z.looseObject({
  code: z.string(),
  description: z.string(),
});

export const reportingUnitSchema = z.looseObject({
  id: z.number(),
  client: codeDescriptionSchema,
  clientStatus: codeDescriptionSchema,
  grade: codeDescriptionSchema,
  sampling: codeDescriptionSchema,
  district: codeDescriptionSchema,
});

export type ReportingUnitDto = z.infer<typeof reportingUnitSchema>;
