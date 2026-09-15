/**
 * Fixed formula key definitions for formula configuration.
 *
 * Each area (Interior/Coastal) has a specific set of formula keys grouped by category.
 * Keys are read-only and non-editable by users; only expressions are configurable.
 *
 * @see {@link FormulaItemDto} for the formula item shape
 */

/** A single formula key definition with its friendly display label. */
export interface FormulaKeyDefinition {
  /** The technical formula key used in API submissions (e.g., 'block.waste.avoidable_sawlog') */
  readonly key: string;
  /** Friendly display name shown in the UI (e.g., 'Avoidable Sawlog Volume') */
  readonly label: string;
}

/** Formula key groups organized by category. */
export type FormulaKeyGroup = Record<string, readonly FormulaKeyDefinition[]>;

/** Formula key definitions per area type. */
export const FORMULA_KEYS: Record<'INTERIOR' | 'COASTAL', FormulaKeyGroup> = {
  INTERIOR: {
    'Waste Volume Formulas': [
      { key: 'block.waste.avoidable_sawlog', label: 'Avoidable Sawlog Volume' },
      { key: 'block.waste.avoidable_grade4', label: 'Avoidable Grade 4 Volume' },
      { key: 'block.waste.unavoidable', label: 'Unavoidable Volume' },
      { key: 'block.waste.total_m3ha', label: 'Total Waste Volume (m\u00B3/ha)' },
      { key: 'block.waste.total_m3', label: 'Total Waste Volume (m\u00B3)' },
    ],
    'Area Formulas': [
      { key: 'block.area.road', label: 'Road Area' },
      { key: 'block.area.net_waste', label: 'Net Waste Area' },
    ],
    'Benchmark Formulas': [{ key: 'block.benchmark.zone', label: 'Benchmark Zone' }],
  },
  COASTAL: {
    'Waste Volume Formulas': [
      { key: 'block.waste.avoidable_sawlog', label: 'Avoidable Sawlog Volume' },
      { key: 'block.waste.avoidable_grades_ux', label: 'Avoidable Grade U/X Volume' },
      { key: 'block.waste.avoidable_grade_y', label: 'Avoidable Grade Y Volume' },
      { key: 'block.waste.unavoidable', label: 'Unavoidable Volume' },
      { key: 'block.waste.total_m3ha', label: 'Total Waste Volume (m\u00B3/ha)' },
      { key: 'block.waste.total_m3', label: 'Total Waste Volume (m\u00B3)' },
    ],
    'Area Formulas': [
      { key: 'block.area.road', label: 'Road Area' },
      { key: 'block.area.net_waste', label: 'Net Waste Area' },
    ],
    'Benchmark Formulas': [
      { key: 'block.benchmark.weighted', label: 'Weighted Benchmark' },
      { key: 'block.coast.heli.factor', label: 'Heli Logging Factor' },
    ],
  },
} as const;

/**
 * Returns the flat list of formula keys for a given area.
 * Useful for initializing carry-forward or validating submitted formulas.
 */
export function getFormulaKeysForArea(
  area: 'INTERIOR' | 'COASTAL',
): readonly FormulaKeyDefinition[] {
  const groups = FORMULA_KEYS[area];
  return Object.values(groups).flat();
}

/**
 * Looks up the friendly label for a formula key.
 * Returns the key itself if no match is found.
 */
export function getFormulaLabel(area: 'INTERIOR' | 'COASTAL', key: string): string {
  const keys = getFormulaKeysForArea(area);
  const match = keys.find((k) => k.key === key);
  return match?.label ?? key;
}
