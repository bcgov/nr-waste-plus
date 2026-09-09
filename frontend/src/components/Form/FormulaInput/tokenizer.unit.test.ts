import { describe, it, expect } from 'vitest';

import { tokenizeFormula } from './tokenizer';

import type { TokenType } from './types';

describe('tokenizeFormula', () => {
  describe('identifier tokenization', () => {
    it('should tokenize a single variable', () => {
      const tokens = tokenizeFormula('x', new Set(['x']));
      expect(tokens).toHaveLength(1);
      expect(tokens[0]).toEqual({
        type: 'variable',
        value: 'x',
        startIndex: 0,
        endIndex: 1,
      });
    });

    it('should tokenize multiple variables', () => {
      const tokens = tokenizeFormula('x + y', new Set(['x', 'y']));
      const variables = tokens.filter((t) => t.type === 'variable');
      expect(variables).toHaveLength(2);
      expect(variables[0].value).toBe('x');
      expect(variables[1].value).toBe('y');
    });

    it('should tokenize underscore in identifier', () => {
      const tokens = tokenizeFormula('my_var', new Set(['my_var']));
      expect(tokens[0]).toEqual({
        type: 'variable',
        value: 'my_var',
        startIndex: 0,
        endIndex: 6,
      });
    });

    it('should tokenize numeric characters in identifiers', () => {
      const tokens = tokenizeFormula('var1', new Set(['var1']));
      expect(tokens[0]).toEqual({
        type: 'variable',
        value: 'var1',
        startIndex: 0,
        endIndex: 4,
      });
    });

    it('should tokenize long identifiers', () => {
      const tokens = tokenizeFormula('myLongVariableName', new Set(['myLongVariableName']));
      expect(tokens[0].value).toBe('myLongVariableName');
    });

    it('should classify builtin functions correctly', () => {
      const tokens = tokenizeFormula('sin(x)', new Set(['x']));
      const sinToken = tokens[0];
      expect(sinToken.type).toBe('function');
      expect(sinToken.value).toBe('sin');
    });

    it('should classify user-defined variables correctly', () => {
      const tokens = tokenizeFormula('amount', new Set(['amount']));
      expect(tokens[0].type).toBe('variable');
      expect(tokens[0].value).toBe('amount');
    });

    it('should mark undefined identifiers as variables', () => {
      const tokens = tokenizeFormula('unknown', new Set());
      expect(tokens[0].type).toBe('variable');
      expect(tokens[0].value).toBe('unknown');
    });
  });

  describe('number tokenization', () => {
    it('should tokenize integer', () => {
      const tokens = tokenizeFormula('42', new Set());
      expect(tokens[0]).toEqual({
        type: 'number',
        value: '42',
        startIndex: 0,
        endIndex: 2,
      });
    });

    it('should tokenize decimal number', () => {
      const tokens = tokenizeFormula('3.14', new Set());
      expect(tokens[0]).toEqual({
        type: 'number',
        value: '3.14',
        startIndex: 0,
        endIndex: 4,
      });
    });

    it('should tokenize number starting with decimal point', () => {
      const tokens = tokenizeFormula('.5', new Set());
      expect(tokens[0]).toEqual({
        type: 'number',
        value: '.5',
        startIndex: 0,
        endIndex: 2,
      });
    });

    it('should tokenize scientific notation (positive exponent)', () => {
      const tokens = tokenizeFormula('1.5e10', new Set());
      expect(tokens[0]).toEqual({
        type: 'number',
        value: '1.5e10',
        startIndex: 0,
        endIndex: 6,
      });
    });

    it('should tokenize scientific notation (negative exponent)', () => {
      const tokens = tokenizeFormula('1.5e-10', new Set());
      expect(tokens[0]).toEqual({
        type: 'number',
        value: '1.5e-10',
        startIndex: 0,
        endIndex: 7,
      });
    });

    it('should tokenize scientific notation (positive signed exponent)', () => {
      const tokens = tokenizeFormula('2e+5', new Set());
      expect(tokens[0]).toEqual({
        type: 'number',
        value: '2e+5',
        startIndex: 0,
        endIndex: 4,
      });
    });

    it('should tokenize uppercase E in scientific notation', () => {
      const tokens = tokenizeFormula('1E-3', new Set());
      expect(tokens[0].value).toBe('1E-3');
    });

    it('should tokenize multiple numbers in expression', () => {
      const tokens = tokenizeFormula('10 + 20', new Set());
      const numbers = tokens.filter((t) => t.type === 'number');
      expect(numbers).toHaveLength(2);
      expect(numbers[0].value).toBe('10');
      expect(numbers[1].value).toBe('20');
    });

    it('should handle trailing underscore in number (if supported by math.js)', () => {
      const tokens = tokenizeFormula('123_456', new Set());
      // May be parsed as single number depending on math.js support
      expect(tokens[0].type).toBe('number');
    });
  });

  describe('operator tokenization', () => {
    it('should tokenize addition operator', () => {
      const tokens = tokenizeFormula('+', new Set());
      expect(tokens[0]).toEqual({
        type: 'operator',
        value: '+',
        startIndex: 0,
        endIndex: 1,
      });
    });

    it('should tokenize subtraction operator', () => {
      const tokens = tokenizeFormula('-', new Set());
      expect(tokens[0]).toEqual({
        type: 'operator',
        value: '-',
        startIndex: 0,
        endIndex: 1,
      });
    });

    it('should tokenize multiplication operator', () => {
      const tokens = tokenizeFormula('*', new Set());
      expect(tokens[0]).toEqual({
        type: 'operator',
        value: '*',
        startIndex: 0,
        endIndex: 1,
      });
    });

    it('should tokenize division operator', () => {
      const tokens = tokenizeFormula('/', new Set());
      expect(tokens[0]).toEqual({
        type: 'operator',
        value: '/',
        startIndex: 0,
        endIndex: 1,
      });
    });

    it('should tokenize exponentiation operator', () => {
      const tokens = tokenizeFormula('^', new Set());
      expect(tokens[0]).toEqual({
        type: 'operator',
        value: '^',
        startIndex: 0,
        endIndex: 1,
      });
    });

    it('should tokenize modulo operator', () => {
      const tokens = tokenizeFormula('%', new Set());
      expect(tokens[0]).toEqual({
        type: 'operator',
        value: '%',
        startIndex: 0,
        endIndex: 1,
      });
    });

    it('should tokenize all operators in sequence', () => {
      const tokens = tokenizeFormula('+-*/%^', new Set());
      const operators = tokens.filter((t) => t.type === 'operator');
      expect(operators).toHaveLength(6);
    });
  });

  describe('punctuation tokenization', () => {
    it('should tokenize opening parenthesis', () => {
      const tokens = tokenizeFormula('(', new Set());
      expect(tokens[0]).toEqual({
        type: 'punctuation',
        value: '(',
        startIndex: 0,
        endIndex: 1,
      });
    });

    it('should tokenize closing parenthesis', () => {
      const tokens = tokenizeFormula(')', new Set());
      expect(tokens[0]).toEqual({
        type: 'punctuation',
        value: ')',
        startIndex: 0,
        endIndex: 1,
      });
    });

    it('should tokenize comma', () => {
      const tokens = tokenizeFormula(',', new Set());
      expect(tokens[0]).toEqual({
        type: 'punctuation',
        value: ',',
        startIndex: 0,
        endIndex: 1,
      });
    });

    it('should tokenize nested parentheses', () => {
      const tokens = tokenizeFormula('((x))', new Set(['x']));
      const punctuation = tokens.filter((t) => t.type === 'punctuation');
      expect(punctuation).toHaveLength(4);
    });

    it('should tokenize function arguments with comma separation', () => {
      const tokens = tokenizeFormula('max(a,b)', new Set(['a', 'b']));
      const commas = tokens.filter((t) => t.value === ',');
      expect(commas).toHaveLength(1);
    });
  });

  describe('whitespace handling', () => {
    it('should skip spaces', () => {
      const tokens = tokenizeFormula('x + y', new Set(['x', 'y']));
      const nonSpace = tokens.filter((t) => t.type !== 'unknown');
      expect(nonSpace).toHaveLength(3); // x, +, y
    });

    it('should skip tabs', () => {
      const tokens = tokenizeFormula('x\t+\ty', new Set(['x', 'y']));
      const operators = tokens.filter((t) => t.type === 'operator');
      expect(operators).toHaveLength(1);
    });

    it('should skip leading whitespace', () => {
      const tokens = tokenizeFormula('  x', new Set(['x']));
      expect(tokens[0].value).toBe('x');
      expect(tokens[0].startIndex).toBe(2);
    });

    it('should skip trailing whitespace', () => {
      const tokens = tokenizeFormula('x  ', new Set(['x']));
      expect(tokens).toHaveLength(1);
    });

    it('should handle mixed whitespace', () => {
      const tokens = tokenizeFormula(' x   +   y ', new Set(['x', 'y']));
      expect(tokens).toHaveLength(3);
    });
  });

  describe('complex expressions', () => {
    it('should tokenize quadratic formula elements', () => {
      const tokens = tokenizeFormula('a*x^2+b*x+c', new Set(['a', 'b', 'c', 'x']));
      expect(tokens.length).toBeGreaterThan(0);
      expect(tokens[0].value).toBe('a');
    });

    it('should tokenize function with multiple arguments', () => {
      const tokens = tokenizeFormula('max(1, 2, 3)', new Set());
      const numbers = tokens.filter((t) => t.type === 'number');
      expect(numbers).toHaveLength(3);
    });

    it('should tokenize nested function calls', () => {
      const tokens = tokenizeFormula('sin(cos(x))', new Set(['x']));
      const functions = tokens.filter((t) => t.type === 'function');
      expect(functions).toHaveLength(2);
      expect(functions[0].value).toBe('sin');
      expect(functions[1].value).toBe('cos');
    });

    it('should tokenize complex expression with mixed operators', () => {
      const tokens = tokenizeFormula('2*x + 3*y - 5', new Set(['x', 'y']));
      expect(tokens.length).toBeGreaterThan(0);
      const operators = tokens.filter((t) => t.type === 'operator');
      expect(operators.length).toBeGreaterThan(0);
    });

    it('should preserve token positions', () => {
      const tokens = tokenizeFormula('x + y', new Set(['x', 'y']));
      tokens.forEach((token, i) => {
        if (i > 0) {
          expect(token.startIndex).toBeGreaterThanOrEqual(tokens[i - 1].endIndex);
        }
      });
    });
  });

  describe('error recovery', () => {
    it('should handle invalid formula gracefully', () => {
      // Should not throw even if formula is unparseable
      expect(() => {
        tokenizeFormula('!@#$%', new Set());
      }).not.toThrow();
    });

    it('should mark unknown symbols as unknown type', () => {
      const tokens = tokenizeFormula('!', new Set());
      expect(tokens[0].type).toBe('unknown');
    });

    it('should handle multiple unknown characters', () => {
      const tokens = tokenizeFormula('x @ y', new Set(['x', 'y']));
      expect(tokens).toHaveLength(3);
    });

    it('should tokenize unmatched parentheses', () => {
      // Should not throw
      const tokens = tokenizeFormula('(x + y', new Set(['x', 'y']));
      expect(tokens.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty formula', () => {
      const tokens = tokenizeFormula('', new Set());
      expect(tokens).toHaveLength(0);
    });

    it('should handle only whitespace', () => {
      const tokens = tokenizeFormula('   ', new Set());
      expect(tokens).toHaveLength(0);
    });

    it('should handle single character variable', () => {
      const tokens = tokenizeFormula('x', new Set(['x']));
      expect(tokens).toHaveLength(1);
      expect(tokens[0].value).toBe('x');
    });

    it('should handle consecutive operators', () => {
      // e.g., 5+-3 (unusual but valid in some contexts)
      const tokens = tokenizeFormula('+-', new Set());
      const operators = tokens.filter((t) => t.type === 'operator');
      expect(operators).toHaveLength(2);
    });

    it('should handle expression starting with operator', () => {
      const tokens = tokenizeFormula('-x', new Set(['x']));
      const operators = tokens.filter((t) => t.type === 'operator');
      expect(operators).toHaveLength(1);
      expect(operators[0].value).toBe('-');
    });

    it('should handle expression ending with operator', () => {
      const tokens = tokenizeFormula('x+', new Set(['x']));
      const operators = tokens.filter((t) => t.type === 'operator');
      expect(operators).toHaveLength(1);
    });

    it('should preserve exact positions', () => {
      const formula = 'x+y';
      const tokens = tokenizeFormula(formula, new Set(['x', 'y']));
      tokens.forEach((token) => {
        const extracted = formula.slice(token.startIndex, token.endIndex);
        expect(extracted).toBe(token.value);
      });
    });
  });

  describe('known variables tracking', () => {
    it('should classify variables from known set', () => {
      const known = new Set(['amount', 'rate']);
      const tokens = tokenizeFormula('amount + rate', known);
      const variables = tokens.filter((t) => t.type === 'variable');
      expect(variables).toHaveLength(2);
      expect(variables[0].value).toBe('amount');
      expect(variables[1].value).toBe('rate');
    });

    it('should classify function calls as functions', () => {
      const known = new Set(['x']);
      const tokens = tokenizeFormula('myFunc(x)', known);
      const token = tokens.find((t) => t.value === 'myFunc');
      // mathjs recognizes it as a FunctionNode since it's followed by parentheses
      expect(token?.type).toBe('function');
    });

    it('should distinguish between function and variable with same name if context known', () => {
      const known = new Set(['sin']);
      const tokens = tokenizeFormula('sin', known);
      // Even if sin is in known set, it's also a builtin function
      // The tokenizer will classify it as function since isMathBuiltin returns true for sin
      expect(tokens[0].type).toBe('function');
    });

    it('should handle empty known variables set', () => {
      const tokens = tokenizeFormula('x + y', new Set());
      const variables = tokens.filter((t) => t.type === 'variable');
      expect(variables).toHaveLength(2);
    });
  });

  describe('special formula patterns', () => {
    it('should tokenize formula with implicit multiplication (if parsed by math.js)', () => {
      const tokens = tokenizeFormula('2x', new Set(['x']));
      expect(tokens.length).toBeGreaterThan(0);
    });

    it('should tokenize formula with scientific notation in complex expression', () => {
      const tokens = tokenizeFormula('1e5 + 2.3e-3', new Set());
      const numbers = tokens.filter((t) => t.type === 'number');
      expect(numbers).toHaveLength(2);
    });

    it('should tokenize formula with multiple levels of nesting', () => {
      const tokens = tokenizeFormula('((a + b) * (c + d))', new Set(['a', 'b', 'c', 'd']));
      const parens = tokens.filter(
        (t) => t.type === 'punctuation' && (t.value === '(' || t.value === ')'),
      );
      // Formula has 2 outer parens + 2 for (a+b) + 2 for (c+d) = 6 total
      expect(parens).toHaveLength(6);
    });

    it('should handle power operator with negative base', () => {
      const tokens = tokenizeFormula('(-2)^3', new Set());
      const operators = tokens.filter((t) => t.type === 'operator');
      expect(operators.some((op) => op.value === '^')).toBe(true);
    });
  });

  describe('token type validation', () => {
    it('should only return valid token types', () => {
      const validTypes: TokenType[] = [
        'function',
        'variable',
        'number',
        'operator',
        'punctuation',
        'unknown',
      ];
      const tokens = tokenizeFormula('sin(2*x)+y', new Set(['x', 'y']));
      tokens.forEach((token) => {
        expect(validTypes).toContain(token.type);
      });
    });

    it('should have correct endIndex after startIndex', () => {
      const tokens = tokenizeFormula('x + 123', new Set(['x']));
      tokens.forEach((token) => {
        expect(token.endIndex).toBeGreaterThan(token.startIndex);
      });
    });

    it('should have valid indices within formula length', () => {
      const formula = 'a + b';
      const tokens = tokenizeFormula(formula, new Set(['a', 'b']));
      tokens.forEach((token) => {
        expect(token.startIndex).toBeGreaterThanOrEqual(0);
        expect(token.endIndex).toBeLessThanOrEqual(formula.length);
      });
    });
  });
});
