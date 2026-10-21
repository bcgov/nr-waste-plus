import { z } from 'zod';

/**
 * A formula validation issue attached client-side by the conformance
 * checker (never serialized by the backend).
 */
const formulaValidationErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  startOffset: z.number().optional(),
  endOffset: z.number().optional(),
});

/**
 * One formula of a set as serialized by `FormulaItemDto` (`formulaKey`,
 * `expression`, `sortOrder` — nothing else), extended with the two optional
 * fields the editor attaches client-side for display.
 */
const formulaItemSchema = z.object({
  formulaKey: z.string(),
  expression: z.string(),
  declaredVariables: z.array(z.string()).optional(), // client-side; never sent by the backend
  validationErrors: z.array(formulaValidationErrorSchema).optional(), // client-side display only
  sortOrder: z.int(),
});

/**
 * List row as serialized by `FormulaSetListItemDto` — a slimmed shape with
 * the formula count and audit timestamps but no `formulas` array.
 */
export const formulaSetListItemSchema = z.object({
  id: z.int(),
  area: z.enum(['INTERIOR', 'COASTAL']),
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable(),
  deleted: z.boolean(),
  formulaCount: z.int(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/**
 * Formula set detail as serialized by `FormulaSetResponse` — the full
 * `formulas` array and no audit timestamps.
 *
 * Parsed at the boundary by the effective / by-id / current query hooks.
 */
export const formulaSetSchema = z.object({
  id: z.int(),
  area: z.enum(['INTERIOR', 'COASTAL']),
  startDate: z.iso.date(),
  endDate: z.iso.date().nullable(),
  deleted: z.boolean(),
  formulas: z.array(formulaItemSchema),
});

/**
 * Create/update request body as accepted by `FormulaSetRequest` (outgoing,
 * client-constructed — never parsed). The backend manages `endDate` itself;
 * the request carries no such field. `startDate` must be a valid
 * `LocalDate`.
 */
export interface FormulaSetRequest {
  area: 'INTERIOR' | 'COASTAL';
  startDate: string;
  formulas: FormulaItemDto[];
}

/** Parameters for the effective-formula-set lookup. */
export interface FormulaSetEffectiveParams {
  date: string; // YYYY-MM-DD
  area: 'INTERIOR' | 'COASTAL';
}

/** Parameters for the current open-ended formula set lookup. */
export interface CurrentFormulaSetParams {
  area: 'INTERIOR' | 'COASTAL';
}

/**
 * A node in the nested variable tree — branch (object) or leaf (number).
 * Every field except `type` is `@JsonInclude(NON_NULL)` on the backend, so
 * absent keys mean "not applicable to this node kind".
 */
interface VariableNodeDto {
  type: 'object' | 'number';
  description?: string;
  children?: Record<string, VariableNodeDto>;
  path?: string;
  value?: number;
  label?: string;
}

const variableNodeSchema: z.ZodType<VariableNodeDto> = z.lazy(() =>
  z.object({
    type: z.enum(['object', 'number']),
    description: z.string().optional(),
    children: z.record(z.string(), variableNodeSchema).optional(),
    path: z.string().optional(),
    value: z.number().optional(),
    label: z.string().optional(),
  }),
);

const formulaVariableCatalogItemSchema = z.object({
  path: z.string(),
  label: z.string(),
  value: z.number().optional(), // NON_NULL on the backend
});

const formulaNamespaceCatalogSchema = z.object({
  prefix: z.string(),
  label: z.string(),
  description: z.string(),
  availability: z.enum(['RUNTIME', 'SUBMISSION']),
  variables: z.array(formulaVariableCatalogItemSchema),
});

/**
 * Response from the formula variables endpoint as serialized by
 * `FormulaVariablesResponse` (`effectiveDate` is a `LocalDate`).
 *
 * Parsed at the boundary in `useFormulaVariables`.
 */
export const formulaVariablesSchema = z.object({
  effectiveDate: z.iso.date(),
  area: z.enum(['INTERIOR', 'COASTAL']),
  namespaces: z.record(z.string(), variableNodeSchema),
  flat: z.record(z.string(), z.number()),
  schema: z.record(z.string(), z.unknown()),
  catalog: z.array(formulaNamespaceCatalogSchema),
});

/** Parameters for the formula variables endpoint. */
export interface FormulaVariablesParams {
  date: string; // YYYY-MM-DD
  area: 'INTERIOR' | 'COASTAL';
  /**
   * District code required by the backend — variables are district-scoped.
   * The editor pins this to {@link FORMULA_VARIABLES_DISTRICT_CODE}.
   */
  districtCode: string;
}

export type FormulaValidationError = z.infer<typeof formulaValidationErrorSchema>;
export type FormulaItemDto = z.infer<typeof formulaItemSchema>;
export type FormulaSetListItem = z.infer<typeof formulaSetListItemSchema>;
export type FormulaSetResponse = z.infer<typeof formulaSetSchema>;
export type FormulaVariablesResponse = z.infer<typeof formulaVariablesSchema>;
export type FormulaVariableCatalogItem = z.infer<typeof formulaVariableCatalogItemSchema>;
export type FormulaNamespaceCatalog = z.infer<typeof formulaNamespaceCatalogSchema>;
