import { describe, it, expect } from 'vitest';

import { math, isMathBuiltin } from './math.config';

describe('math.config', () => {
  describe('math instance', () => {
    it('should be a MathJsInstance', () => {
      expect(math).toBeDefined();
      expect(typeof math.evaluate).toBe('function');
      expect(typeof math.parse).toBe('function');
    });

    it('should evaluate expressions with BigNumber precision', () => {
      const result = math.evaluate('0.1 + 0.2');
      // BigNumber arithmetic should give exact result
      expect(result.toString()).toBe('0.3');
    });

    it('should handle complex BigNumber calculations', () => {
      const result = math.evaluate('10 + 5 * 2');
      expect(result.toString()).toBe('20');
    });

    it('should support BigNumber constants like pi', () => {
      const result = math.evaluate('pi');
      expect(result).toBeDefined();
      expect(result.toString()).toContain('3.14');
    });

    it('should handle scientific notation with BigNumber', () => {
      const result = math.evaluate('1.5e-10');
      expect(result.toString()).toBe('1.5e-10');
    });

    it('should preserve precision with large numbers', () => {
      const result = math.evaluate('123456789012345678901234567890');
      // BigNumber preserves full precision, not truncated like JavaScript number
      expect(result.toString()).toContain('1.234567890123456789');
    });
  });

  describe('isMathBuiltin', () => {
    describe('trigonometric functions', () => {
      it('should identify sin as builtin', () => {
        expect(isMathBuiltin('sin')).toBe(true);
      });

      it('should identify cos as builtin', () => {
        expect(isMathBuiltin('cos')).toBe(true);
      });

      it('should identify tan as builtin', () => {
        expect(isMathBuiltin('tan')).toBe(true);
      });

      it('should identify inverse trig functions as builtin', () => {
        expect(isMathBuiltin('asin')).toBe(true);
        expect(isMathBuiltin('acos')).toBe(true);
        expect(isMathBuiltin('atan')).toBe(true);
        expect(isMathBuiltin('atan2')).toBe(true);
      });

      it('should identify hyperbolic functions as builtin', () => {
        expect(isMathBuiltin('sinh')).toBe(true);
        expect(isMathBuiltin('cosh')).toBe(true);
        expect(isMathBuiltin('tanh')).toBe(true);
        expect(isMathBuiltin('asinh')).toBe(true);
        expect(isMathBuiltin('acosh')).toBe(true);
        expect(isMathBuiltin('atanh')).toBe(true);
      });
    });

    describe('exponential and logarithmic functions', () => {
      it('should identify sqrt as builtin', () => {
        expect(isMathBuiltin('sqrt')).toBe(true);
      });

      it('should identify cbrt as builtin', () => {
        expect(isMathBuiltin('cbrt')).toBe(true);
      });

      it('should identify exp as builtin', () => {
        expect(isMathBuiltin('exp')).toBe(true);
      });

      it('should identify logarithm functions as builtin', () => {
        expect(isMathBuiltin('log')).toBe(true);
        expect(isMathBuiltin('log2')).toBe(true);
        expect(isMathBuiltin('log10')).toBe(true);
      });

      it('should identify pow as builtin', () => {
        expect(isMathBuiltin('pow')).toBe(true);
      });
    });

    describe('rounding functions', () => {
      it('should identify abs as builtin', () => {
        expect(isMathBuiltin('abs')).toBe(true);
      });

      it('should identify ceil as builtin', () => {
        expect(isMathBuiltin('ceil')).toBe(true);
      });

      it('should identify floor as builtin', () => {
        expect(isMathBuiltin('floor')).toBe(true);
      });

      it('should identify round as builtin', () => {
        expect(isMathBuiltin('round')).toBe(true);
      });

      it('should identify sign as builtin', () => {
        expect(isMathBuiltin('sign')).toBe(true);
      });
    });

    describe('aggregate functions', () => {
      it('should identify min as builtin', () => {
        expect(isMathBuiltin('min')).toBe(true);
      });

      it('should identify max as builtin', () => {
        expect(isMathBuiltin('max')).toBe(true);
      });

      it('should identify sum as builtin', () => {
        expect(isMathBuiltin('sum')).toBe(true);
      });

      it('should identify mean as builtin', () => {
        expect(isMathBuiltin('mean')).toBe(true);
      });

      it('should identify median as builtin', () => {
        expect(isMathBuiltin('median')).toBe(true);
      });

      it('should identify mod as builtin', () => {
        expect(isMathBuiltin('mod')).toBe(true);
      });
    });

    describe('constants', () => {
      it('should identify pi as builtin', () => {
        expect(isMathBuiltin('pi')).toBe(true);
      });

      it('should identify e as builtin', () => {
        expect(isMathBuiltin('e')).toBe(true);
      });

      it('should identify phi as builtin', () => {
        expect(isMathBuiltin('phi')).toBe(true);
      });

      it('should identify tau as builtin', () => {
        expect(isMathBuiltin('tau')).toBe(true);
      });

      it('should identify Infinity as builtin', () => {
        expect(isMathBuiltin('Infinity')).toBe(true);
      });

      it('should identify NaN as builtin', () => {
        expect(isMathBuiltin('NaN')).toBe(true);
      });

      it('should identify i (imaginary unit) as builtin', () => {
        expect(isMathBuiltin('i')).toBe(true);
      });
    });

    describe('boolean and other keywords', () => {
      it('should identify true as builtin', () => {
        expect(isMathBuiltin('true')).toBe(true);
      });

      it('should identify false as builtin', () => {
        expect(isMathBuiltin('false')).toBe(true);
      });

      it('should identify null as builtin', () => {
        expect(isMathBuiltin('null')).toBe(true);
      });

      it('should identify undefined as builtin', () => {
        expect(isMathBuiltin('undefined')).toBe(true);
      });
    });

    describe('non-builtin identifiers', () => {
      it('should not identify custom variables as builtin', () => {
        expect(isMathBuiltin('myVar')).toBe(false);
      });

      it('should not identify custom functions as builtin', () => {
        expect(isMathBuiltin('customFunc')).toBe(false);
      });

      it('should not identify random strings as builtin', () => {
        expect(isMathBuiltin('xyz')).toBe(false);
      });

      it('should not identify single letters (except i) as builtin', () => {
        expect(isMathBuiltin('x')).toBe(false);
        expect(isMathBuiltin('y')).toBe(false);
        expect(isMathBuiltin('z')).toBe(false);
      });

      it('should be case-sensitive', () => {
        expect(isMathBuiltin('SIN')).toBe(false);
        expect(isMathBuiltin('Sin')).toBe(false);
        expect(isMathBuiltin('PI')).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        expect(isMathBuiltin('')).toBe(false);
      });

      it('should handle whitespace', () => {
        expect(isMathBuiltin('  ')).toBe(false);
      });

      it('should handle special characters', () => {
        expect(isMathBuiltin('@')).toBe(false);
        expect(isMathBuiltin('#')).toBe(false);
      });
    });
  });

  describe('math instances have correct configuration', () => {
    it('math should support BigNumber type', () => {
      const result = math.evaluate('1 / 3');
      expect(result.type).toBe('BigNumber');
    });

    it('math should have 64-digit precision', () => {
      // Evaluate a value that will show precision difference
      const result = math.evaluate('1 / 7');
      const str = result.toString();
      // Should have significant digits representing 64-digit precision
      expect(str.length).toBeGreaterThan(20);
    });
  });
});
