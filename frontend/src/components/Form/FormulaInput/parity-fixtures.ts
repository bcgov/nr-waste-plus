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

function fixture(
  id: string,
  expression: string,
  expected: string,
  scope: Record<string, number> = {},
): ParityFixture {
  return { id, expression, scope, expected };
}

export const PARITY_FIXTURES: ParityFixture[] = [
  // ── Basic arithmetic ──
  fixture('arithmetic-addition', '1 + 2', '3'),
  fixture('arithmetic-precedence', '1 + 2 * 3', '7'),
  fixture('arithmetic-parentheses', '(1 + 2) * 3', '9'),
  fixture('arithmetic-variables', 'da.rate * hours + bonus', '11', {
    'da.rate': 2.5,
    'hours': 4,
    'bonus': 1,
  }),
  fixture('arithmetic-unary-minus', '-(1 + 2)', '-3'),

  // ── Rounding boundaries (HALF_UP to 3 decimals) ──
  fixture('rounding-half-up-at-5', '1.2345', '1.235'),
  fixture('rounding-below-5', '1.2344', '1.234'),
  fixture('rounding-at-midpoint', '1.2335', '1.234'),
  fixture('rounding-exact-3-decimals', '1.234', '1.234'),
  fixture('rounding-whole-number', '3.000', '3'),
  fixture('rounding-complex-expression', '1.2345 + 0.0005', '1.235'),

  // ── Built-in functions ──
  fixture('fn-sqrt', 'sqrt(16)', '4'),
  fixture('fn-abs', 'abs(-5)', '5'),
  fixture('fn-min', 'min(3, 7)', '3'),
  fixture('fn-max', 'max(3, 7)', '7'),
  fixture('fn-sin', 'sin(pi / 2)', '1'),
  fixture('fn-floor', 'floor(3.7)', '3'),
  fixture('fn-ceil', 'ceil(3.2)', '4'),

  // ── Conditional (if function) ──
  fixture('if-true-branch', 'if(1, 10, 20)', '10'),
  fixture('if-false-branch', 'if(0, 10, 20)', '20'),
  fixture('if-comparison', 'if(da.rate >= 2, 10, 20)', '10', { 'da.rate': 3 }),
  fixture('if-nested', 'if(1, if(0, 3, 4), 5)', '4'),

  // ── Mixed expressions ──
  fixture('mixed-trig-and-variables', 'sqrt(da.area) + sin(sc.factor)', '5', {
    'da.area': 16,
    'sc.factor': 1.57079632679,
  }),
  fixture('mixed-namespace-variables', 'da.rate + sc.mix + submission.area', '7', {
    'da.rate': 1.5,
    'sc.mix': 2.5,
    'submission.area': 3,
  }),
];
