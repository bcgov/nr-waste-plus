import { describe, it, expect } from 'vitest';
import { math } from './math.config';
import { PARITY_FIXTURES } from './parity-fixtures';
import type { BigNumber } from 'mathjs';

/**
 * Cross-eval parity test harness.
 *
 * Proves that mathjs in BigNumber 64-digit mode with HALF_UP rounding to
 * 3 decimals produces the same results as the backend exp4j evaluator
 * (doubles + BigDecimal HALF_UP to 3 decimals).
 *
 * Each fixture in PARITY_FIXTURES is evaluated through mathjs, rounded,
 * and compared to the expected string. The same fixtures are tested on the
 * backend in FormulaEvaluatorExp4jIntegrationTest.
 */
describe('Formula evaluator parity (mathjs BigNumber vs exp4j)', () => {
  for (const fixture of PARITY_FIXTURES) {
    it(`${fixture.id}: ${fixture.expression}`, () => {
      // Convert scope to BigNumber (mirrors evaluateFormula in utils.ts)
      const bigScope: Record<string, BigNumber> = {};
      for (const [key, val] of Object.entries(fixture.scope)) {
        bigScope[key] = math.bignumber(val);
      }

      // Evaluate
      const result = math.evaluate(fixture.expression, bigScope);

      // Round to 3 decimals (HALF_UP, mathjs default)
      const rounded = math.round(result, 3) as BigNumber;
      const str = rounded.toFixed();
      const formatted = str.includes('.') ? str.replace(/\.?0+$/, '') : str;

      expect(formatted).toBe(fixture.expected);
    });
  }

  it('should round 0.1 + 0.2 to 0.3 (BigNumber precision)', () => {
    const result = math.evaluate('0.1 + 0.2');
    const rounded = math.round(result, 3) as BigNumber;
    expect(rounded.toFixed()).toBe('0.3');
  });

  it('should handle nested function calls', () => {
    const result = math.evaluate('sqrt(abs(-16))');
    const rounded = math.round(result, 3) as BigNumber;
    expect(rounded.toFixed()).toBe('4');
  });

  it('should handle comparison expressions returning boolean', () => {
    const result = math.evaluate('1 > 0');
    // Boolean results are not BigNumber — they pass through as-is
    expect(String(result)).toBe('true');
  });
});
