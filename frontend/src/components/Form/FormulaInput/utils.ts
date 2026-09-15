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
 * Reconstructs the full dotted path from a mathjs AccessorNode chain.
 *
 * mathjs parses `block.area.road` as:
 *   AccessorNode("road")
 *     └─ AccessorNode("area")
 *          └─ SymbolNode("block")
 *
 * This helper walks up the `object` chain, collecting property names from
 * IndexNode dimensions (dotNotation), and returns the full dotted path
 * e.g. `"block.area.road"`.
 *
 * @param node - An AccessorNode or SymbolNode from the AST.
 * @returns The reconstructed dotted path, or `null` if the chain cannot be resolved.
 */
function reconstructDottedPath(node: MathNode): string | null {
  const parts: string[] = [];
  let current: MathNode = node;

  while (current) {
    const n = current as unknown as {
      type: string;
      name?: string;
      object?: MathNode;
      index?: { dimensions?: Array<{ type: string; value?: string }> };
    };

    if (n.type === 'SymbolNode' && n.name) {
      // Root of the chain — prepend the symbol name
      parts.unshift(n.name);
      break;
    }

    if (n.type === 'AccessorNode' && n.index?.dimensions?.[0]) {
      const dim = n.index.dimensions[0] as unknown as { type: string; value?: string };
      if (dim.type === 'ConstantNode' && dim.value !== undefined) {
        parts.unshift(dim.value);
      }
      current = n.object!;
      continue;
    }

    // Unexpected node type — bail
    return null;
  }

  return parts.length > 0 ? parts.join('.') : null;
}

/**
 * Walks a mathjs AST and collects every variable reference as a full dotted path.
 *
 * - Simple variables like `rate` produce `["rate"]`.
 * - Nested accessors like `block.area.road` produce `["block.area.road"]`.
 * - mathjs built-ins (sin, cos, pi, etc.) are excluded.
 *
 * For AccessorNode chains, only the outermost (full) path is returned.
 * Intermediate paths like `da.mature` are filtered out when `da.mature.total` exists.
 *
 * This is the single source of truth for "which variables does this formula
 * reference?" — used by both the evaluation layer and the dependency graph.
 */
export function extractVariables(node: MathNode): string[] {
  const vars = new Set<string>();
  const accessorRoots = new Set<string>(); // root symbols involved in AccessorNode chains

  node.traverse((n: MathNode) => {
    const sym = n as unknown as { type: string; name: string };

    if (sym.type === 'SymbolNode' && !isMathBuiltin(sym.name)) {
      vars.add(sym.name);
    }

    // Handle namespace accessors like da.mature.avoidableGradeY — extract full path
    if (sym.type === 'AccessorNode') {
      const path = reconstructDottedPath(n);
      if (path) {
        const rootName = path.split('.')[0];
        if (!isMathBuiltin(rootName)) {
          // Remove the root-only entry and mark this root as part of a chain
          vars.delete(rootName);
          accessorRoots.add(rootName);
          vars.add(path);
        }
      }
    }
  });

  // Filter out partial paths: if we have "da.mature.total", remove "da.mature" and "da"
  // This happens because traverse visits intermediate AccessorNodes too.
  const result = Array.from(vars).filter((v) => {
    // Keep if this is a root symbol not involved in any AccessorNode chain
    if (!v.includes('.')) return !accessorRoots.has(v);
    // Keep if no other variable starts with this one followed by a dot
    return !Array.from(vars).some((other) => other !== v && other.startsWith(v + '.'));
  });

  return result;
}

// ─── Scope Nesting ────────────────────────────────────────────────────────────

/**
 * Converts a flat scope with dotted keys into a nested object structure
 * that mathjs can resolve for AccessorNode evaluation.
 *
 * @example
 * buildNestedScope({ "block.area.road": 123, "rate": 2.5 })
 * // → { block: { area: { road: 123 } }, rate: 2.5 }
 *
 * Non-dotted keys are passed through as leaf values.
 * When a dotted key conflicts with a non-dotted key, the non-dotted key wins
 * (matching the fixed-over-dynamic precedence in useFormulaEngine).
 */
export function buildNestedScope(flat: Record<string, number>): Record<string, unknown> {
  // Use a null-prototype object for the root so dangerous keys like
  // `__proto__` or `constructor` cannot resolve to inherited Object.prototype
  // members (prototype pollution guard).
  const nested: Record<string, unknown> = Object.create(null) as Record<string, unknown>;

  // Assign flat keys first so they win over dotted keys regardless of input order.
  for (const [key, value] of Object.entries(flat)) {
    if (!key.includes('.')) nested[key] = value;
  }

  for (const [key, value] of Object.entries(flat)) {
    if (!key.includes('.')) continue;

    const parts = key.split('.');
    let current: Record<string, unknown> = nested;

    if (Object.hasOwn(nested, parts[0]) && typeof nested[parts[0]] !== 'object') continue;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      // Own-property check only: `part in current` would treat inherited
      // members (e.g. `__proto__`) as existing namespaces and descend into
      // Object.prototype. Null-prototype namespace objects make any `__proto__`
      // assignment a plain data property instead of a prototype write.
      if (
        !Object.hasOwn(current, part) ||
        typeof current[part] !== 'object' ||
        current[part] === null
      ) {
        current[part] = Object.create(null) as Record<string, unknown>;
      }
      current = current[part] as Record<string, unknown>;
    }

    current[parts[parts.length - 1]] = value;
  }

  return nested;
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
    // Nest flat dotted keys so mathjs can resolve AccessorNode chains
    // e.g. { "block.area.road": 123 } → { block: { area: { road: 123 } } }
    const nestedScope = buildNestedScope(scope);

    // Convert scope to BigNumber so that mixed arithmetic stays precise
    const convertToBigNumber = (obj: unknown): unknown => {
      if (typeof obj === 'number') {
        return math.bignumber(obj);
      }
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
        const out: Record<string, unknown> = {};
        for (const [k, v] of Object.entries(obj)) {
          out[k] = convertToBigNumber(v);
        }
        return out;
      }
      return obj;
    };
    const bigScope = convertToBigNumber(nestedScope) as Record<string, unknown>;

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
 * @param allVariables  - The full available variable scope (flat dotted keys)
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
