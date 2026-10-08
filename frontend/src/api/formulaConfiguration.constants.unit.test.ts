import { describe, expect, it } from 'vitest';

import {
  FORMULA_KEYS,
  FORMULA_VARIABLES_DISTRICT_CODE,
  getFormulaKeysForArea,
} from './formulaConfiguration.constants.ts';

describe('FORMULA_VARIABLES_DISTRICT_CODE', () => {
  it('pins the district code sent to the variables endpoint', () => {
    expect(FORMULA_VARIABLES_DISTRICT_CODE).toBe('DKM');
  });
});

describe('FORMULA_KEYS', () => {
  it('exposes 10 interior keys and 12 coastal keys with no duplicates', () => {
    expect(getFormulaKeysForArea('INTERIOR')).toHaveLength(10);
    expect(getFormulaKeysForArea('COASTAL')).toHaveLength(12);

    for (const area of ['INTERIOR', 'COASTAL'] as const) {
      const keys = getFormulaKeysForArea(area).map((definition) => definition.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('includes the 1355 catalog additions in both areas', () => {
    for (const area of ['INTERIOR', 'COASTAL'] as const) {
      const keys = getFormulaKeysForArea(area).map((definition) => definition.key);
      expect(keys).toContain('block.waste.total_cut_control');
      expect(keys).toContain('block.waste.dispersed_retention_factor');
    }
  });

  it('groups factors separately from benchmarks', () => {
    expect(FORMULA_KEYS.INTERIOR['Factors']).toEqual([
      { key: 'block.waste.dispersed_retention_factor', label: 'Dispersed Retention Factor' },
    ]);
    expect(FORMULA_KEYS.INTERIOR['Benchmark Formulas']).toEqual([
      { key: 'block.benchmark.zone', label: 'Benchmark Zone' },
    ]);

    expect(FORMULA_KEYS.COASTAL['Factors']).toEqual([
      { key: 'block.coast.heli.factor', label: 'Heli Logging Factor' },
      { key: 'block.waste.dispersed_retention_factor', label: 'Dispersed Retention Factor' },
    ]);
    expect(FORMULA_KEYS.COASTAL['Benchmark Formulas']).toEqual([
      { key: 'block.benchmark.weighted', label: 'Weighted Benchmark' },
    ]);
  });

  it('uses the Figma label for the coastal billable total', () => {
    const coastalTotal = FORMULA_KEYS.COASTAL['Waste Volume Formulas'].find(
      (definition) => definition.key === 'block.waste.total_m3',
    );
    expect(coastalTotal?.label).toBe('Total billable volume (m³)');
  });
});
