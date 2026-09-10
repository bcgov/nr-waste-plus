/**
 * @file FormulaInput/utils.ts
 *
 * Pure utility functions for formula parsing, evaluation, and dependency analysis.
 * All exports are stateless and side-effect free (SOLID — Single Responsibility).
 *
 * Design decisions:
 *  - mathjs is configured in BigNumber mode (64-digit precision) to avoid
 *    IEEE 754 double-precision drift. This is critical for billing correctness.
 *  - AST-driven tokenization lives in `tokenizer.ts`; math configuration in
 *    `math.config.ts`; shared types in `types.ts`.
 */

import { math, isMathBuiltin } from './math.config';

import type { FormulaError, EvaluationResult, DependencyGraph } from './types';
import type { MathNode, BigNumber } from 'mathjs';

// Re-export everything so existing consumers of './utils' continue to work
// without any import path changes.
export { math, isMathBuiltin } from './math.config';
export type {
  FormulaError,
  TokenType,
  PositionedToken,
  EvaluationResult,
  DependencyGraph,
} from './types';
export { tokenizeFormula } from './tokenizer';

// ─── Parsing ─────────────────────────────────────────────────────────────────

/**
 * Attempts to parse `formula` into a mathjs AST.
 *
 * @returns The root `MathNode` on success, or a `FormulaError` on failure.
 */
export function parseFormula(formula: string): MathNode | FormulaError {
  if (!formula.trim()) {
    return { message: 'Formula is empty.' };
  }
  try {
    return math.parse(formula);
  } catch (err: unknown) {
    return buildFormulaError(err, formula);
  }
}

/** Type guard: narrows a parse result to `FormulaError`. */
export function isFormulaError(value: MathNode | FormulaError): value is FormulaError {
  // MathNode always has a `type` string property; FormulaError has `message`.
  return 'message' in value && !('type' in value);
}

// ─── Variable Extraction ──────────────────────────────────────────────────────

/**
 * Walks a mathjs AST and collects every SymbolNode name that is NOT a
 * mathjs built-in. This is the single source of truth for "which variables
 * does this formula reference?" — used by both the evaluation layer and
 * the dependency graph.
 */
export function extractVariables(node: MathNode): string[] {
  const vars = new Set<string>();
  node.traverse((n: MathNode) => {
    const sym = n as unknown as { type: string; name: string };
    if (sym.type === 'SymbolNode' && !isMathBuiltin(sym.name)) {
      vars.add(sym.name);
    }
    // Handle namespace accessors like da.rate — extract the root object name
    if (sym.type === 'AccessorNode') {
      const object = (sym as unknown as { object: MathNode }).object;
      if (
        object?.type === 'SymbolNode' &&
        !isMathBuiltin((object as unknown as { name: string }).name)
      ) {
        vars.add((object as unknown as { name: string }).name);
      }
    }
    // Handle indexed access like arr[0] — extract the array name
    if (sym.type === 'IndexNode') {
      const object = (sym as unknown as { object: MathNode }).object;
      if (
        object?.type === 'SymbolNode' &&
        !isMathBuiltin((object as unknown as { name: string }).name)
      ) {
        vars.add((object as unknown as { name: string }).name);
      }
    }
  });
  return Array.from(vars);
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

/**
 * Allowed function names that may appear in formulas.
 * Any function call not in this list is rejected before evaluation to prevent
 * injection of unexpected operations.
 */
const ALLOWED_FUNCTIONS = new Set<string>([
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
  // Custom
  'if',
]);

/**
 * Walks the AST and collects every function call name.
 * Returns an array of `{ name, position }` for error reporting.
 */
function collectFunctionCalls(node: MathNode): Array<{ name: string; position?: number }> {
  const calls: Array<{ name: string; position?: number }> = [];
  node.traverse((n: MathNode) => {
    const fn = n as unknown as { type: string; name: string; begin?: number };
    if (fn.type === 'FunctionNode') {
      calls.push({ name: fn.name, position: fn.begin });
    }
  });
  return calls;
}

/**
 * Validates that every function call in the AST is in the allowlist.
 * Returns a FormulaError if any disallowed function is found, or null if valid.
 */
function validateFunctionCalls(node: MathNode): FormulaError | null {
  const calls = collectFunctionCalls(node);
  for (const { name } of calls) {
    if (!ALLOWED_FUNCTIONS.has(name)) {
      return {
        message: `Function "${name}" is not allowed. Use only standard math functions (sqrt, abs, min, max, etc.).`,
      };
    }
  }
  return null;
}

/**
 * Validates a formula string and returns either the validated AST or an error.
 * Extracted from `evaluateFormula` to reduce cognitive complexity.
 */
function validateFormulaInput(
  formula: string,
  ast: MathNode | undefined,
  scope: Record<string, number>,
): { ok: true; ast: MathNode } | { ok: false; error: FormulaError } {
  if (!formula.trim()) {
    return { ok: false, error: { message: 'Formula is empty.' } };
  }

  const parseResult = ast ?? parseFormula(formula);
  if (isFormulaError(parseResult)) {
    return { ok: false, error: parseResult };
  }

  const fnError = validateFunctionCalls(parseResult);
  if (fnError) {
    return { ok: false, error: fnError };
  }

  const usedVars = extractVariables(parseResult);
  const missing = usedVars.filter((v) => !(v in scope));
  if (missing.length > 0) {
    const label = missing.length === 1 ? 'variable' : 'variables';
    return {
      ok: false,
      error: {
        message: `Missing ${label}: ${missing.join(', ')}. Add ${missing.length === 1 ? 'it' : 'them'} to the parameter list.`,
        token: missing[0],
      },
    };
  }

  return { ok: true, ast: parseResult };
}

/** Error message for non-finite results. */
const NONFINITE_ERROR =
  'The result is infinite. Check for division by zero or exponents of very large numbers.';

/**
 * Safely evaluates `formula` against the given variable `scope`.
 *
 * ### Safety
 * - mathjs's `evaluate()` runs in a sandboxed scope with no access to Node/browser
 *   globals, so formula strings cannot exfiltrate data or execute arbitrary code.
 * - Variable names are validated against the scope before evaluation, so an
 *   undefined variable never reaches the evaluator.
 * - Function calls are validated against an allowlist before evaluation, so
 *   disallowed functions are rejected upfront.
 * - The formula is parsed before evaluation; a parse error is returned as a
 *   typed `FormulaError` rather than a thrown exception.
 *
 * ### Precision
 * Results are computed in 64-digit BigNumber arithmetic to avoid the
 * floating-point drift that IEEE 754 doubles introduce (critical for billing).
 *
 * @param formula - Formula string, e.g. `"rate * hours + bonus"`
 * @param scope   - All variable values (fixed and dynamic merged)
 */
export function evaluateFormula(
  formula: string,
  scope: Record<string, number>,
  ast?: MathNode,
): EvaluationResult {
  const validation = validateFormulaInput(formula, ast, scope);
  if (!validation.ok) {
    return { value: null, error: validation.error, raw: null };
  }

  try {
    // Convert scope to BigNumber so that mixed arithmetic stays precise
    const bigScope: Record<string, BigNumber> = {};
    for (const [key, val] of Object.entries(scope)) {
      bigScope[key] = math.bignumber(val);
    }

    // Use compiled AST to avoid re-parsing the formula string
    const result = validation.ast.compile().evaluate(bigScope);

    if (result === null || result === undefined) {
      return { value: null, error: { message: 'Formula produced no value.' }, raw: null };
    }

    if (typeof result === 'object' && 'isBigNumber' in result && result.isBigNumber) {
      const raw = result as unknown as BigNumber;
      if (!raw.isFinite()) {
        return {
          value: null,
          error: {
            message:
              'Division by zero: the denominator evaluates to 0. Add a guard or change the formula.',
          },
          raw,
        };
      }
      return { value: formatResult(raw), error: null, raw };
    }

    if (typeof result === 'number') {
      if (!Number.isFinite(result)) {
        return { value: null, error: { message: NONFINITE_ERROR }, raw: null };
      }
      const raw = math.bignumber(result);
      return { value: formatResult(raw), error: null, raw };
    }

    return { value: String(result), error: null, raw: null };
  } catch (err: unknown) {
    return { value: null, error: buildFormulaError(err, formula), raw: null };
  }
}

/**
 * Formats a BigNumber for display.
 * Rounds to 3 decimal places using HALF_UP (mathjs `round` default)
 * per ADR gate verdict condition #4, then strips trailing zeros.
 *
 * @example formatResult(math.bignumber('3.1456')) → '3.146'
 * @example formatResult(math.bignumber('3.1400')) → '3.14'
 * @example formatResult(math.bignumber('3.0000')) → '3'
 */
function formatResult(value: BigNumber): string {
  // math.round with BigNumber mode uses HALF_UP — matches the ADR requirement.
  const rounded = math.round(value, 3) as BigNumber;
  const str = rounded.toFixed();
  return str.includes('.') ? str.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '') : str;
}

// ─── Dependency Graph ─────────────────────────────────────────────────────────

/**
 * Builds a dependency graph for a single formula.
 *
 * Returns `{ formula: ['varA', 'varB', ...] }` where the value is the list of
 * variables from `allVariables` that the formula actually references.
 *
 * The structure is a `Record` (not just an array) so it can be extended to
 * multi-formula dependency tracking without breaking the API.
 *
 * @param formula       - Formula string to analyse
 * @param allVariables  - The full available variable scope
 */
export function buildDependencyGraph(
  formula: string,
  allVariables: Record<string, number>,
): DependencyGraph {
  const parseResult = parseFormula(formula);
  if (isFormulaError(parseResult)) {
    return { formula: [] };
  }
  const used = extractVariables(parseResult).filter((v) => v in allVariables);
  return { formula: used };
}

// ─── Error Building ───────────────────────────────────────────────────────────

/**
 * Converts a raw mathjs or JavaScript error into a structured, user-friendly
 * `FormulaError`. Extracts position info from the error when available.
 */
function buildFormulaError(err: unknown, formula: string): FormulaError {
  const e = err as Record<string, unknown>;
  const rawMsg = typeof e?.message === 'string' ? e.message : String(err);
  // mathjs parse errors expose the character offset (1-based)
  const char = typeof e?.char === 'number' ? e.char : undefined;

  const message = humanizeErrorMessage(rawMsg, formula);

  const startColumn = char;
  const endColumn = char == null ? undefined : findTokenEnd(formula, char - 1) + 1;

  return { message, startColumn, endColumn };
}

/**
 * Translates a technical mathjs error message into plain English.
 * Keep this list ordered from most-specific to most-general.
 */
function humanizeErrorMessage(raw: string, _formula: string): string {
  if (/unexpected end/i.test(raw)) {
    return 'The formula is incomplete — check for missing values or unclosed parentheses.';
  }
  if (/unexpected token/i.test(raw)) {
    const token = /unexpected token "([^"]+)"/i.exec(raw)?.[1];
    return token
      ? `Unexpected symbol "${token}". Check for typos or misplaced operators.`
      : 'Unexpected symbol in formula. Check for typos or misplaced operators.';
  }
  if (/undefined symbol/i.test(raw)) {
    const symbol = /undefined symbol\s+([^\s(]+)/i.exec(raw)?.[1];
    return symbol
      ? `"${symbol}" is not defined. Add it to the parameter list or check the spelling.`
      : 'Unknown variable used. Make sure all variable names match the parameter list exactly.';
  }
  if (/too few arguments/i.test(raw)) {
    return 'A function call is missing one or more arguments.';
  }
  if (/parenthes/i.test(raw)) {
    return 'Mismatched parentheses — every opening "(" must have a matching closing ")".';
  }
  if (/division by zero/i.test(raw) || /divide by zero/i.test(raw)) {
    return 'Division by zero: the denominator evaluates to 0. Add a guard or change the formula.';
  }
  if (/not a number/i.test(raw) || /NaN/.test(raw)) {
    return 'The formula produced an invalid number (NaN). This often happens with 0/0 or sqrt of a negative.';
  }
  if (/overflow/i.test(raw)) {
    return 'The result is too large to represent (arithmetic overflow).';
  }
  if (/infinity/i.test(raw)) {
    return 'The result is infinite. Check for division by zero or exponents of very large numbers.';
  }
  // Strip internal stack context but keep the original message as a fallback
  return raw.replace(/\s+at\s+[\s\S]*$/, '').trim() || 'An unknown error occurred in the formula.';
}

/**
 * Given a 0-based start index, finds the end of the current word/token.
 * Used to widen a single-character error position into a full token range.
 */
function findTokenEnd(formula: string, start: number): number {
  let end = start;
  while (end < formula.length && /[a-zA-Z0-9_.]/.test(formula[end])) end++;
  // Ensure at least one character is covered
  return end === start ? start + 1 : end;
}
