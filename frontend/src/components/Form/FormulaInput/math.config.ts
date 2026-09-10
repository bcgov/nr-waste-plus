import { create, all } from 'mathjs';

import type { MathJsInstance } from 'mathjs';

/**
 * A mathjs instance locked to BigNumber (64-digit) arithmetic.
 * Import this everywhere — do NOT use the default `mathjs` export directly,
 * as that defaults to floating-point `number` and will silently lose precision.
 *
 * @example
 *   math.evaluate('0.1 + 0.2') // → BigNumber '0.3' (correct)
 *   // vs plain: 0.1 + 0.2    // → 0.30000000000000004 (wrong for billing)
 */
export const math: MathJsInstance = create(all, {
  number: 'BigNumber',
  precision: 64,
});

// ─── Custom Functions ──────────────────────────────────────────────────────────

/**
 * Register `if(condition, trueValue, falseValue)` as a custom mathjs function.
 * Matches the exp4j `if` registration on the backend. Uses eager evaluation
 * (all branches evaluated) which is acceptable for the gate spike — production
 * use should implement short-circuit evaluation.
 */
math.import(
  {
    if: (condition: unknown, trueValue: unknown, falseValue: unknown) => {
      const cond =
        typeof condition === 'object' && condition !== null && 'toNumber' in condition
          ? (condition as { toNumber(): number }).toNumber()
          : Number(condition);
      return cond ? trueValue : falseValue;
    },
  },
  { override: false },
);

// ─── Math Builtins Registry ───────────────────────────────────────────────────

/**
 * Names that mathjs recognises as built-in functions or constants.
 * Identifiers in this set are coloured differently from user variables and
 * are excluded from the "undefined variable" validation pass.
 *
 * Extend this set if you add custom mathjs functions.
 */
const MATH_BUILTINS = new Set<string>([
  // Trigonometry
  'sin',
  'cos',
  'tan',
  'asin',
  'acos',
  'atan',
  'atan2',
  'sinh',
  'cosh',
  'tanh',
  'asinh',
  'acosh',
  'atanh',
  // Exponents / logarithms
  'sqrt',
  'cbrt',
  'exp',
  'log',
  'log2',
  'log10',
  'pow',
  // Rounding
  'abs',
  'ceil',
  'floor',
  'round',
  'sign',
  // Aggregates
  'min',
  'max',
  'sum',
  'mean',
  'median',
  'mod',
  // Constants
  'pi',
  'e',
  'phi',
  'tau',
  'Infinity',
  'NaN',
  'i',
  // Boolean / misc
  'true',
  'false',
  'null',
  'undefined',
  // Custom functions
  'if',
]);

/**
 * Determines whether a name is a mathjs built-in function or constant.
 *
 * @param name - the identifier to check
 * @returns true if the name is a mathjs built-in; false if it is a user variable or unknown identifier
 * @example
 * isMathBuiltin('sin')      // true
 * isMathBuiltin('myVar')    // false
 */
export function isMathBuiltin(name: string): boolean {
  return MATH_BUILTINS.has(name);
}
