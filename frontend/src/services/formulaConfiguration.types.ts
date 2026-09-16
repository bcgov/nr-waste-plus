export interface FormulaValidationError {
  code: string;
  message: string;
  startOffset?: number;
  endOffset?: number;
}

export interface FormulaItemDto {
  formulaKey: string;
  expression: string;
  declaredVariables?: string[];
  validationErrors?: FormulaValidationError[];
  sortOrder: number;
}

export interface FormulaSetResponse {
  id: number;
  area: 'INTERIOR' | 'COASTAL';
  startDate: string; // ISO date string
  endDate: string | null;
  deleted: boolean;
  formulas: FormulaItemDto[];
}

export interface FormulaSetListItemDto {
  id: number;
  area: 'INTERIOR' | 'COASTAL';
  startDate: string; // ISO date string
  endDate: string | null;
  deleted: boolean;
  formulaCount: number;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface FormulaSetListResponse {
  content: FormulaSetListItemDto[];
  page: {
    number: number;
    size: number;
    totalElements: number;
    totalPages: number;
  };
}

export interface FormulaSetRequest {
  area: 'INTERIOR' | 'COASTAL';
  startDate: string; // ISO date string
  endDate: string | null;
  formulas: FormulaItemDto[];
}

export interface FormulaSetEffectiveParams {
  date: string; // YYYY-MM-DD
  area: 'INTERIOR' | 'COASTAL';
}

export interface CurrentFormulaSetParams {
  area: 'INTERIOR' | 'COASTAL';
}

// ─── Formula Variables ────────────────────────────────────────────────────────

/** A node in the nested variable tree — branch (object) or leaf (number). */
export interface VariableNodeDto {
  /** Node type: "object" for branches, "number" for leaves. */
  type: 'object' | 'number';
  /** Optional human-readable description (branch nodes). */
  description?: string;
  /** Child nodes (present on branch nodes). */
  children?: Record<string, VariableNodeDto>;
  /** Dotted variable path (leaf nodes only, e.g. "da.mature.avoidableGradeY"). */
  path?: string;
  /** Resolved numeric value (leaf nodes only). */
  value?: number;
  /** Human-readable label (leaf nodes only). */
  label?: string;
}

/** Response from the formula variables endpoint. */
export interface FormulaVariablesResponse {
  /** The date for which variable values are resolved. */
  effectiveDate: string;
  /** The geographic area. */
  area: 'INTERIOR' | 'COASTAL';
  /** Nested variable tree with resolved values. */
  namespaces: Record<string, VariableNodeDto>;
  /** Backward-compatible flat map of dotted path → value. */
  flat: Record<string, number>;
  /** Structure-only metadata (cacheable). */
  schema: Record<string, unknown>;
  /** Complete grammar-approved namespace catalog for the authoring UI. */
  catalog: FormulaNamespaceCatalog[];
}

export interface FormulaVariableCatalogItem {
  path: string;
  label: string;
  value?: number;
}

export interface FormulaNamespaceCatalog {
  prefix: string;
  label: string;
  description: string;
  availability: 'RUNTIME' | 'SUBMISSION';
  variables: FormulaVariableCatalogItem[];
}

/** Parameters for the formula variables endpoint. */
export interface FormulaVariablesParams {
  date: string; // YYYY-MM-DD
  area: 'INTERIOR' | 'COASTAL';
  districtCode: string;
}
