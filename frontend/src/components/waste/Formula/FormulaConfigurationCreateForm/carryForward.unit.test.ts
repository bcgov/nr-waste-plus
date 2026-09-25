import { carryForwardFormulaValues } from './carryForward.ts';

describe('carryForwardFormulaValues', () => {
  it('carries matching expressions, defaults new keys to one, and drops removed keys', () => {
    const result = carryForwardFormulaValues(
      {
        matching: { expression: '1', validationErrors: [] },
        added: { expression: '1', validationErrors: [] },
        removed: { expression: 'old', validationErrors: [] },
      },
      ['matching', 'added'],
      [
        {
          formulaKey: 'matching',
          expression: 'previous',
          declaredVariables: [],
          validationErrors: [],
          sortOrder: 0,
        },
        {
          formulaKey: 'removed',
          expression: 'old',
          declaredVariables: [],
          validationErrors: [],
          sortOrder: 1,
        },
      ],
      new Set(),
    );

    expect(result).toEqual({
      matching: { expression: 'previous', validationErrors: [] },
      added: { expression: '1', validationErrors: [] },
    });
  });

  it('preserves edited values', () => {
    const result = carryForwardFormulaValues(
      { matching: { expression: 'edited', validationErrors: [] } },
      ['matching'],
      [
        {
          formulaKey: 'matching',
          expression: 'previous',
          declaredVariables: [],
          validationErrors: [],
          sortOrder: 0,
        },
      ],
      new Set(['matching']),
    );

    expect(result.matching.expression).toBe('edited');
  });

  it('always yields an explicit validationErrors array when the DTO omits it', () => {
    const result = carryForwardFormulaValues(
      { matching: { expression: '1', validationErrors: [] } },
      ['matching'],
      [{ formulaKey: 'matching', expression: 'previous', sortOrder: 0 }],
      new Set(),
    );

    expect(result.matching.validationErrors).toEqual([]);
  });
});
