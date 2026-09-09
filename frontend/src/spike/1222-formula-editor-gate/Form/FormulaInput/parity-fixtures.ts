/**
 * @file Parity test fixtures for formula evaluators.
 *
 * Each case defines:
 *  - expression: the formula string
 *  - scope: variable values (plain numbers)
 *  - expected: the expected result string after HALF_UP rounding to 3 decimals
 *
 * These same cases should pass on the backend (exp4j + BigDecimal HALF_UP)
 * and frontend (mathjs BigNumber + math.round(v, 3)).
 */

export interface ParityFixture {
  id: string;
  expression: string;
  scope: Record<string, number>;
  expected: string;
}

export const PARITY_FIXTURES: ParityFixture[] = [
  // ── Basic arithmetic ──
  {
    id: 'arithmetic-addition',
    expression: '1 + 2',
    scope: {},
    expected: '3',
  },
  {
    id: 'arithmetic-precedence',
    expression: '1 + 2 * 3',
    scope: {},
    expected: '7',
  },
  {
    id: 'arithmetic-parentheses',
    expression: '(1 + 2) * 3',
    scope: {},
    expected: '9',
  },
  {
    id: 'arithmetic-variables',
    expression: 'da.rate * hours + bonus',
    scope: { 'da.rate': 2.5, 'hours': 4, 'bonus': 1 },
    expected: '11',
  },
  {
    id: 'arithmetic-unary-minus',
    expression: '-(1 + 2)',
    scope: {},
    expected: '-3',
  },

  // ── Rounding boundaries (HALF_UP to 3 decimals) ──
  {
    id: 'rounding-half-up-at-5',
    expression: '1.2345',
    scope: {},
    expected: '1.235',
  },
  {
    id: 'rounding-below-5',
    expression: '1.2344',
    scope: {},
    expected: '1.234',
  },
  {
    id: 'rounding-at-midpoint',
    expression: '1.2335',
    scope: {},
    expected: '1.234',
  },
  {
    id: 'rounding-exact-3-decimals',
    expression: '1.234',
    scope: {},
    expected: '1.234',
  },
  {
    id: 'rounding-whole-number',
    expression: '3.000',
    scope: {},
    expected: '3',
  },
  {
    id: 'rounding-complex-expression',
    expression: '1.2345 + 0.0005',
    scope: {},
    expected: '1.235',
  },

  // ── Built-in functions ──
  {
    id: 'fn-sqrt',
    expression: 'sqrt(16)',
    scope: {},
    expected: '4',
  },
  {
    id: 'fn-abs',
    expression: 'abs(-5)',
    scope: {},
    expected: '5',
  },
  {
    id: 'fn-min',
    expression: 'min(3, 7)',
    scope: {},
    expected: '3',
  },
  {
    id: 'fn-max',
    expression: 'max(3, 7)',
    scope: {},
    expected: '7',
  },
  {
    id: 'fn-sin',
    expression: 'sin(pi / 2)',
    scope: {},
    expected: '1',
  },
  {
    id: 'fn-floor',
    expression: 'floor(3.7)',
    scope: {},
    expected: '3',
  },
  {
    id: 'fn-ceil',
    expression: 'ceil(3.2)',
    scope: {},
    expected: '4',
  },

  // ── Conditional (if function) ──
  {
    id: 'if-true-branch',
    expression: 'if(1, 10, 20)',
    scope: {},
    expected: '10',
  },
  {
    id: 'if-false-branch',
    expression: 'if(0, 10, 20)',
    scope: {},
    expected: '20',
  },
  {
    id: 'if-comparison',
    expression: 'if(da.rate >= 2, 10, 20)',
    scope: { 'da.rate': 3 },
    expected: '10',
  },
  {
    id: 'if-nested',
    expression: 'if(1, if(0, 3, 4), 5)',
    scope: {},
    expected: '4',
  },

  // ── Mixed expressions ──
  {
    id: 'mixed-trig-and-variables',
    expression: 'sqrt(da.area) + sin(sc.factor)',
    scope: { 'da.area': 16, 'sc.factor': 1.57079632679 },
    expected: '5',
  },
  {
    id: 'mixed-namespace-variables',
    expression: 'da.rate + sc.mix + submission.area',
    scope: { 'da.rate': 1.5, 'sc.mix': 2.5, 'submission.area': 3 },
    expected: '7',
  },
];
