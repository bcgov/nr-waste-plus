import type { MathNode } from 'mathjs';

import { math, isMathBuiltin } from './math.config';
import type { PositionedToken, TokenType } from './types';

// ─── Private Helpers ──────────────────────────────────────────────────────────

/** Resolves the token type for an identifier based on AST-derived name sets. */
function classifyIdentifier(
  name: string,
  functionNames: Set<string>,
  variableNames: Set<string>,
): TokenType {
  if (functionNames.has(name) || isMathBuiltin(name)) return 'function';
  if (variableNames.has(name)) return 'variable';
  // Not in scope — mark as variable; Monaco will squiggle it via markers
  return 'variable';
}

/** Tokenizes a leading identifier span starting at `i`. */
function tokenizeIdentifier(
  formula: string,
  i: number,
  functionNames: Set<string>,
  variableNames: Set<string>,
): PositionedToken {
  let j = i;
  while (j < formula.length && /\w/.test(formula[j])) j++;
  const name = formula.slice(i, j);
  return {
    type: classifyIdentifier(name, functionNames, variableNames),
    value: name,
    startIndex: i,
    endIndex: j,
  };
}

/** Tokenizes a numeric literal (integer, decimal, scientific notation) starting at `i`. */
function tokenizeNumber(formula: string, i: number): PositionedToken {
  let j = i;
  while (j < formula.length && /[0-9._]/.test(formula[j])) j++;
  // Scientific notation tail: e.g. 1.5e-10
  if (j < formula.length && /[eE]/.test(formula[j])) {
    j++;
    if (j < formula.length && /[+-]/.test(formula[j])) j++;
    while (j < formula.length && /\d/.test(formula[j])) j++;
  }
  return { type: 'number', value: formula.slice(i, j), startIndex: i, endIndex: j };
}

/** Tokenizes a single arithmetic operator character at `i`. Returns null if no match. */
function tokenizeOperator(formula: string, i: number): PositionedToken | null {
  if (!/[+\-*/^%]/.test(formula[i])) return null;
  return { type: 'operator', value: formula[i], startIndex: i, endIndex: i + 1 };
}

/** Tokenizes a single punctuation character at `i`. Returns null if no match. */
function tokenizePunctuation(formula: string, i: number): PositionedToken | null {
  if (!/[(),.]/.test(formula[i])) return null;
  return { type: 'punctuation', value: formula[i], startIndex: i, endIndex: i + 1 };
}

/** Collects function and variable names from a mathjs AST into the provided sets. */
function classifyAstNodes(
  formula: string,
  functionNames: Set<string>,
  variableNames: Set<string>,
): void {
  try {
    const ast = math.parse(formula);
    ast.traverse((node: MathNode) => {
      const n = node as unknown as {
        type: string;
        name?: string;
        fn?: { name?: string } | string;
      };
      if (n.type === 'FunctionNode') {
        const fnName = typeof n.fn === 'string' ? n.fn : (n.fn as { name?: string })?.name;
        if (fnName) functionNames.add(fnName);
      } else if (n.type === 'SymbolNode' && n.name) {
        if (!isMathBuiltin(n.name) && !functionNames.has(n.name)) {
          variableNames.add(n.name);
        }
      }
    });
  } catch {
    // Parse failed — we still tokenize; every identifier will be 'variable'
    // and Monaco markers will highlight the actual error separately.
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Tokenizes a formula string into semantically-typed, positioned tokens.
 *
 * ### Why not regex?
 * A regex tokenizer can tell you "this looks like an identifier", but it
 * cannot tell you whether that identifier is a variable, a function call, or
 * an unknown symbol. By first parsing the formula into a mathjs AST, we learn
 * the semantic role of every identifier from the tree structure, not from the
 * surface syntax. We then use that knowledge to annotate each character span.
 *
 * ### Algorithm
 * 1. Parse → AST (collect FunctionNode names and SymbolNode names).
 * 2. Walk source string left-to-right, consuming one token at a time.
 * 3. For each identifier span, look up the AST-derived classification.
 *
 * @param formula        - Raw formula string (may be invalid; we handle errors gracefully).
 * @param knownVariables - Set of variable names currently in scope (fixed + dynamic).
 * @returns array of positioned tokens with semantic type classification (function, variable, number, operator, punctuation, or unknown).
 */
export function tokenizeFormula(formula: string, knownVariables: Set<string>): PositionedToken[] {
  // ── Step 1: AST classification pass ─────────────────────────────────────────
  const functionNames = new Set<string>();
  const variableNames = new Set<string>(knownVariables);
  classifyAstNodes(formula, functionNames, variableNames);

  // ── Step 2: Character-level walk ─────────────────────────────────────────────
  const tokens: PositionedToken[] = [];
  let i = 0;

  while (i < formula.length) {
    const ch = formula[i];

    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    if (/[a-zA-Z_]/.test(ch)) {
      const token = tokenizeIdentifier(formula, i, functionNames, variableNames);
      tokens.push(token);
      i = token.endIndex;
      continue;
    }

    if (/\d/.test(ch) || (ch === '.' && /\d/.test(formula[i + 1] ?? ''))) {
      const token = tokenizeNumber(formula, i);
      tokens.push(token);
      i = token.endIndex;
      continue;
    }

    const token =
      tokenizeOperator(formula, i) ??
      tokenizePunctuation(formula, i) ??
      ({ type: 'unknown' as TokenType, value: ch, startIndex: i, endIndex: i + 1 } as const);

    tokens.push(token);
    i = token.endIndex;
  }

  return tokens;
}
