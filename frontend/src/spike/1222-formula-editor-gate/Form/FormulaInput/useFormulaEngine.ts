/**
 * @file FormulaInput/useFormulaEngine.ts
 *
 * React hook that encapsulates all formula business logic:
 * evaluation, variable resolution, and precision checking.
 *
 * ### Architecture
 * Parses the formula string exactly once per keystroke via a shared `parsedAst`
 * memo. Both `result` and `usedVariables` derive from that single AST node
 * rather than re-parsing independently, reducing per-keystroke work.
 */

import { useState, useCallback, useMemo } from 'react';

import {
  evaluateFormula,
  extractVariables,
  parseFormula,
  isFormulaError,
  checkDoublePrecisionDrift,
} from './utils';

import type { EvaluationResult } from './types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseFormulaEngineOptions {
  /**
   * Fixed parameters retrieved from an API (e.g. via TanStack Query).
   * These take precedence over `dynamicParams` in case of a name collision,
   * matching the principle that server-authoritative values win.
   */
  fixedParams: Record<string, number>;

  /**
   * Parameters added or removed by the user at runtime.
   * Variable names here are immediately available for autocomplete.
   */
  dynamicParams: Record<string, number>;

  /**
   * Starting formula displayed when the editor first mounts.
   * @default ''
   */
  initialFormula?: string;

  /**
   * Invoked every time the formula string changes.
   * The consumer is responsible for debouncing / persisting if needed.
   */
  onChange?: (formula: string) => void;
}

export interface FormulaEngineState {
  /** Current formula string (controlled). */
  formula: string;
  /** Latest evaluation outcome. */
  result: EvaluationResult;
  /**
   * Variable names that the current formula actually references.
   * Derived directly from the shared parsed AST — updated in lockstep with
   * `result` without an additional parse of the formula string.
   */
  usedVariables: string[];
  /**
   * Non-null when the BigNumber result differs from a JS-double result by more
   * than the precision threshold. Signals a potential backend disagreement.
   */
  precisionWarning: string | null;
  /**
   * The merged variable scope (dynamic → fixed, so fixed wins on collision).
   * Exposed so the editor can populate completions and hover docs.
   */
  mergedScope: Record<string, number>;
  /** Stable setter — call this when the editor content changes. */
  setFormula: (formula: string) => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages the lifecycle of a formula string: parsing, evaluation,
 * variable extraction, and double-precision drift detection.
 *
 * All derived values are memoised so downstream components only re-render
 * when their specific slice of state actually changes.
 *
 * The formula string is parsed exactly once per change via a shared
 * `parsedAst` memo. Both `result` and `usedVariables` derive from that
 * single AST node, avoiding redundant parses on every keystroke.
 *
 * @example
 * ```tsx
 * const engine = useFormulaEngine({
 *   fixedParams: { tax_rate: 0.15 },
 *   dynamicParams: { quantity: 10 },
 *   initialFormula: 'quantity * tax_rate',
 *   onChange: (f) => form.setValue('billingFormula', f),
 * });
 * ```
 */
export function useFormulaEngine({
  fixedParams,
  dynamicParams,
  initialFormula = '',
  onChange,
}: UseFormulaEngineOptions): FormulaEngineState {
  const [formula, setFormulaState] = useState<string>(initialFormula);

  // ── Merged scope ───────────────────────────────────────────────────────────
  // Dynamic params are spread first so that fixed (server-authoritative) values
  // overwrite them when there is a name collision.
  const mergedScope = useMemo<Record<string, number>>(
    () => ({ ...dynamicParams, ...fixedParams }),
    [fixedParams, dynamicParams],
  );

  // ── Stable setter ──────────────────────────────────────────────────────────
  // Wrapped in useCallback so that the Monaco editor component does not
  // re-receive a new function reference on every render.
  const setFormula = useCallback(
    (f: string) => {
      setFormulaState(f);
      onChange?.(f);
    },
    [onChange],
  );

  // ── Parsed AST ─────────────────────────────────────────────────────────────
  // Parse once per formula change; shared by evaluation and variable extraction
  // so the formula string is never parsed more than once per keystroke.
  const parsedAst = useMemo(() => parseFormula(formula), [formula]);

  // ── Evaluation ─────────────────────────────────────────────────────────────
  // Passes the pre-parsed AST so evaluateFormula skips a redundant parse.
  // Deps: parsedAst (encodes formula changes) + mergedScope (variable values).
  const result = useMemo<EvaluationResult>(() => {
    if (isFormulaError(parsedAst)) return { value: null, error: parsedAst, raw: null };
    return evaluateFormula(formula, mergedScope, parsedAst);
  }, [parsedAst, formula, mergedScope]);

  // ── Variable extraction ────────────────────────────────────────────────────
  // Derives used variables from the shared AST — no second parse.
  const usedVariables = useMemo<string[]>(() => {
    if (isFormulaError(parsedAst)) return [];
    return extractVariables(parsedAst);
  }, [parsedAst]);

  // ── Precision drift warning ────────────────────────────────────────────────
  // Compares the BigNumber result with what a Java double-based evaluator
  // (exp4j) would produce. Non-null means the backend may disagree.
  const precisionWarning = useMemo<string | null>(() => {
    if (!result.raw) return null;
    const { hasDrift, driftAmount } = checkDoublePrecisionDrift(result.raw, formula, mergedScope);
    if (hasDrift) {
      return (
        `Precision warning: this formula's result may differ from the backend ` +
        `by approximately ${driftAmount} (frontend uses 64-bit BigNumber; ` +
        `backend uses exp4j with IEEE 754 double). Verify the formula on the backend before saving.`
      );
    }
    return null;
  }, [result.raw, formula, mergedScope]);

  return {
    formula,
    result,
    usedVariables,
    precisionWarning,
    mergedScope,
    setFormula,
  };
}
