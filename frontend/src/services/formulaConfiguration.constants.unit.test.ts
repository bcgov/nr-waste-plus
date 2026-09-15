import { describe, expect, it } from 'vitest';

import {
  FORMULA_KEYS,
  getFormulaKeysForArea,
  getFormulaLabel,
  type FormulaKeyDefinition,
} from './formulaConfiguration.constants';

describe('FORMULA_KEYS', () => {
  it('exposes INTERIOR and COASTAL area groups', () => {
    expect(Object.keys(FORMULA_KEYS)).toEqual(['INTERIOR', 'COASTAL']);
  });

  describe('INTERIOR', () => {
    it('defines three key groups in order', () => {
      expect(Object.keys(FORMULA_KEYS.INTERIOR)).toEqual([
        'Waste Volume Formulas',
        'Area Formulas',
        'Benchmark Formulas',
      ]);
    });

    it('defines 5 waste volume formula keys', () => {
      const wasteVolume = FORMULA_KEYS.INTERIOR['Waste Volume Formulas'];
      expect(wasteVolume).toHaveLength(5);
      expect(wasteVolume.map((k) => k.key)).toEqual([
        'block.waste.avoidable_sawlog',
        'block.waste.avoidable_grade4',
        'block.waste.unavoidable',
        'block.waste.total_m3ha',
        'block.waste.total_m3',
      ]);
    });

    it('uses friendly display labels', () => {
      const all = Object.values(FORMULA_KEYS.INTERIOR).flat();
      expect(all.map((k) => k.label)).toEqual([
        'Avoidable Sawlog Volume',
        'Avoidable Grade 4 Volume',
        'Unavoidable Volume',
        'Total Waste Volume (m³/ha)',
        'Total Waste Volume (m³)',
        'Road Area',
        'Net Waste Area',
        'Benchmark Zone',
      ]);
    });
  });

  describe('COASTAL', () => {
    it('defines three key groups in order', () => {
      expect(Object.keys(FORMULA_KEYS.COASTAL)).toEqual([
        'Waste Volume Formulas',
        'Area Formulas',
        'Benchmark Formulas',
      ]);
    });

    it('defines 6 waste volume formula keys', () => {
      const wasteVolume = FORMULA_KEYS.COASTAL['Waste Volume Formulas'];
      expect(wasteVolume).toHaveLength(6);
      expect(wasteVolume.map((k) => k.key)).toEqual([
        'block.waste.avoidable_sawlog',
        'block.waste.avoidable_grades_ux',
        'block.waste.avoidable_grade_y',
        'block.waste.unavoidable',
        'block.waste.total_m3ha',
        'block.waste.total_m3',
      ]);
    });

    it('defines coastal-specific benchmark keys', () => {
      const benchmarks = FORMULA_KEYS.COASTAL['Benchmark Formulas'];
      expect(benchmarks.map((k) => k.key)).toEqual([
        'block.benchmark.weighted',
        'block.coast.heli.factor',
      ]);
      expect(benchmarks.map((k) => k.label)).toEqual(['Weighted Benchmark', 'Heli Logging Factor']);
    });
  });
});

describe('getFormulaKeysForArea', () => {
  it('flattens INTERIOR groups into 8 keys preserving group order', () => {
    const keys = getFormulaKeysForArea('INTERIOR');
    expect(keys).toHaveLength(8);
    expect(keys.map((k) => k.key)).toEqual([
      'block.waste.avoidable_sawlog',
      'block.waste.avoidable_grade4',
      'block.waste.unavoidable',
      'block.waste.total_m3ha',
      'block.waste.total_m3',
      'block.area.road',
      'block.area.net_waste',
      'block.benchmark.zone',
    ]);
  });

  it('flattens COASTAL groups into 10 keys preserving group order', () => {
    const keys = getFormulaKeysForArea('COASTAL');
    expect(keys).toHaveLength(10);
    expect(keys.map((k) => k.key)).toEqual([
      'block.waste.avoidable_sawlog',
      'block.waste.avoidable_grades_ux',
      'block.waste.avoidable_grade_y',
      'block.waste.unavoidable',
      'block.waste.total_m3ha',
      'block.waste.total_m3',
      'block.area.road',
      'block.area.net_waste',
      'block.benchmark.weighted',
      'block.coast.heli.factor',
    ]);
  });

  it('returns readonly definitions with key and label', () => {
    const keys = getFormulaKeysForArea('INTERIOR');
    const sawlog = keys.find((k) => k.key === 'block.waste.avoidable_sawlog');
    expect(sawlog).toEqual<FormulaKeyDefinition>({
      key: 'block.waste.avoidable_sawlog',
      label: 'Avoidable Sawlog Volume',
    });
  });
});

describe('getFormulaLabel', () => {
  it('returns the friendly label for a known key', () => {
    expect(getFormulaLabel('INTERIOR', 'block.waste.avoidable_sawlog')).toBe(
      'Avoidable Sawlog Volume',
    );
  });

  it('returns the coastal-specific label for coastal keys', () => {
    expect(getFormulaLabel('COASTAL', 'block.waste.avoidable_grades_ux')).toBe(
      'Avoidable Grade U/X Volume',
    );
    expect(getFormulaLabel('COASTAL', 'block.coast.heli.factor')).toBe('Heli Logging Factor');
  });

  it('falls back to the raw key when a key is not found', () => {
    expect(getFormulaLabel('INTERIOR', 'block.waste.unknown_key')).toBe('block.waste.unknown_key');
  });

  it('does not find INTERIOR-only keys in the COASTAL set', () => {
    expect(getFormulaLabel('COASTAL', 'block.waste.avoidable_grade4')).toBe(
      'block.waste.avoidable_grade4',
    );
  });
});
