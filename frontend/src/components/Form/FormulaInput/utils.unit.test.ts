import { describe, it, expect, vi, afterEach } from 'vitest';

import {
  buildDependencyGraph,
  checkDoublePrecisionDrift,
  evaluateFormula,
  extractVariables,
  isFormulaError,
  math,
  parseFormula,
} from './utils';

describe('FormulaInput utils', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseFormula and isFormulaError', () => {
    it('shouldReturnError_whenFormulaIsEmpty', () => {
      const result = parseFormula('   ');
      expect(isFormulaError(result)).toBe(true);
      if (isFormulaError(result)) {
        expect(result.message).toBe('Formula is empty.');
      }
    });

    it('shouldReturnAst_whenFormulaIsValid', () => {
      const result = parseFormula('a + 1');
      expect(isFormulaError(result)).toBe(false);
      if (!isFormulaError(result)) {
        expect(result.type).toBeDefined();
      }
    });

    it('shouldHumanizeUnexpectedTokenError_whenParserThrowsTokenError', () => {
      vi.spyOn(math, 'parse').mockImplementation(() => {
        throw { message: 'Unexpected token "@" (char 2)', char: 2 };
      });

      const result = parseFormula('a@b');
      expect(isFormulaError(result)).toBe(true);

      if (isFormulaError(result)) {
        expect(result.message).toContain('Unexpected symbol "@"');
        expect(result.startColumn).toBe(2);
        expect(result.endColumn).toBeGreaterThanOrEqual(2);
      }
    });

    it('shouldKeepRawMessage_whenParserThrowsUnknownError', () => {
      vi.spyOn(math, 'parse').mockImplementation(() => {
        throw new Error('custom parser failure at parser.ts:1');
      });

      const result = parseFormula('x +');
      expect(isFormulaError(result)).toBe(true);
      if (isFormulaError(result)) {
        expect(result.message).toContain('custom parser failure');
      }
    });
  });

  describe('extractVariables', () => {
    it('shouldExtractOnlyUserVariables_whenBuiltinsArePresent', () => {
      const parsed = parseFormula('sin(a) + max(b, 2) + pi + c');
      expect(isFormulaError(parsed)).toBe(false);
      if (isFormulaError(parsed)) return;

      const variables = extractVariables(parsed).sort();
      expect(variables).toEqual(['a', 'b', 'c']);
    });
  });

  describe('evaluateFormula', () => {
    it('shouldReturnError_whenFormulaIsEmpty', () => {
      const result = evaluateFormula('  ', { a: 1 });
      expect(result.value).toBeNull();
      expect(result.raw).toBeNull();
      expect(result.error?.message).toBe('Formula is empty.');
    });

    it('shouldReturnError_whenVariablesAreMissing_singleAndMultiple', () => {
      const single = evaluateFormula('a + b', { a: 1 });
      expect(single.value).toBeNull();
      expect(single.error?.message).toContain('Missing variable: b');
      expect(single.error?.token).toBe('b');

      const multiple = evaluateFormula('a + b + c', { a: 1 });
      expect(multiple.value).toBeNull();
      expect(multiple.error?.message).toContain('Missing variables: b, c');
      expect(multiple.error?.token).toBe('b');
    });

    it('shouldEvaluateUsingBigNumber_whenFormulaIsValid', () => {
      const result = evaluateFormula('rate * hours + bonus', {
        rate: 2.5,
        hours: 4,
        bonus: 1,
      });

      expect(result.error).toBeNull();
      expect(result.value).toBe('11');
      expect(result.raw).not.toBeNull();
    });

    it('shouldReturnStringValue_whenResultIsNonNumericType', () => {
      const result = evaluateFormula('1 > 0', {});
      expect(result.error).toBeNull();
      expect(result.value).toBe('true');
      expect(result.raw).toBeNull();
    });

    it('shouldReturnNoValueError_whenEvaluatorReturnsNullish', () => {
      vi.spyOn(math, 'evaluate').mockReturnValueOnce(null as never);

      const result = evaluateFormula('a + 1', { a: 1 });
      expect(result.value).toBeNull();
      expect(result.raw).toBeNull();
      expect(result.error?.message).toBe('Formula produced no value.');
    });

    it('shouldHandleNumberFallback_whenEvaluatorReturnsNumber', () => {
      vi.spyOn(math, 'evaluate').mockReturnValueOnce(7 as never);

      const result = evaluateFormula('a + 1', { a: 1 });
      expect(result.error).toBeNull();
      expect(result.value).toBe('7');
      expect(result.raw).not.toBeNull();
    });

    it('shouldReturnHumanizedError_whenEvaluationThrows', () => {
      vi.spyOn(math, 'evaluate').mockImplementation(() => {
        throw new Error('Division by zero');
      });

      const result = evaluateFormula('a / b', { a: 1, b: 0 });
      expect(result.value).toBeNull();
      expect(result.raw).toBeNull();
      expect(result.error?.message).toContain('Division by zero');
    });
  });

  describe('checkDoublePrecisionDrift', () => {
    it('shouldReturnNoDrift_whenDoubleResultIsNotFinite', () => {
      const raw = math.bignumber(1);
      const result = checkDoublePrecisionDrift(raw, '1 / 0', {}, 1e-9);
      expect(result).toEqual({ hasDrift: false, driftAmount: '0' });
    });

    it('shouldUseAbsoluteDiff_whenRawResultIsZero', () => {
      const raw = math.bignumber(0);
      const noDrift = checkDoublePrecisionDrift(raw, '0', {}, 1e-9);
      expect(noDrift).toEqual({ hasDrift: false, driftAmount: '0' });

      const hasDrift = checkDoublePrecisionDrift(raw, '1e-6', {}, 1e-9);
      expect(hasDrift.hasDrift).toBe(true);
      expect(hasDrift.driftAmount).not.toBe('0');
    });

    it('shouldReportRelativeDrift_whenDifferenceExceedsEpsilon', () => {
      const raw = math.bignumber('0.3');
      const result = checkDoublePrecisionDrift(raw, '0.1 + 0.2', {}, 1e-20);
      expect(result.hasDrift).toBe(true);
      expect(result.driftAmount).not.toBe('0');
    });

    it('shouldReturnNoDrift_whenDifferenceIsWithinEpsilon', () => {
      const raw = math.bignumber('0.3');
      const result = checkDoublePrecisionDrift(raw, '0.1 + 0.2', {}, 1e-3);
      expect(result).toEqual({ hasDrift: false, driftAmount: '0' });
    });

    it('shouldReturnNoDrift_whenDoubleEvaluationThrows', () => {
      const raw = math.bignumber(10);
      const result = checkDoublePrecisionDrift(raw, '(', {});
      expect(result).toEqual({ hasDrift: false, driftAmount: '0' });
    });
  });

  describe('buildDependencyGraph', () => {
    it('shouldReturnEmptyGraph_whenFormulaCannotBeParsed', () => {
      expect(buildDependencyGraph('a + ', { a: 1 })).toEqual({ formula: [] });
    });

    it('shouldReturnOnlyKnownVariables_whenFormulaIsValid', () => {
      const graph = buildDependencyGraph('a + b + c + sin(d)', {
        a: 1,
        c: 3,
        d: 4,
      });
      expect(graph.formula.sort()).toEqual(['a', 'c', 'd']);
    });
  });

  describe('error humanization mappings', () => {
    const cases: Array<{ raw: string; expected: string }> = [
      {
        raw: 'Unexpected end of expression',
        expected: 'The formula is incomplete',
      },
      {
        raw: 'Undefined symbol x',
        expected: '"x" is not defined',
      },
      {
        raw: 'Too few arguments in function',
        expected: 'missing one or more arguments',
      },
      {
        raw: 'Parenthesis ) expected',
        expected: 'Mismatched parentheses',
      },
      {
        raw: 'Not a Number',
        expected: 'invalid number (NaN)',
      },
      {
        raw: 'Arithmetic overflow',
        expected: 'too large to represent',
      },
      {
        raw: 'Infinity encountered',
        expected: 'result is infinite',
      },
    ];

    it.each(cases)('shouldHumanizeSpecificRawMessage_whenParserThrows ($raw)', ({ raw, expected }) => {
      vi.spyOn(math, 'parse').mockImplementation(() => {
        throw { message: raw, char: 1 };
      });

      const result = parseFormula('x');
      expect(isFormulaError(result)).toBe(true);
      if (isFormulaError(result)) {
        expect(result.message).toContain(expected);
      }
    });
  });
});
