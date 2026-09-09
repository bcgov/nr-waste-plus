import type { BigNumber } from 'mathjs';

// ─── Formula Errors ───────────────────────────────────────────────────────────

/** A user-facing error produced during formula parsing or evaluation. */
export interface FormulaError {
  /** Plain-English explanation of what went wrong. */
  message: string;
  /** The offending token text, if known (used for marker highlighting). */
  token?: string;
  /** 1-based column where the error starts in the formula string. */
  startColumn?: number;
  /** 1-based column where the error ends (exclusive). */
  endColumn?: number;
}

// ─── Tokenization ─────────────────────────────────────────────────────────────

/** Semantic classification of a formula token. */
export type TokenType =
  | 'variable' // User-defined variable (fixed or dynamic param)
  | 'number' // Numeric literal (integer, decimal, scientific notation)
  | 'operator' // Arithmetic operator (+, -, *, /, ^, %)
  | 'function' // mathjs built-in or user function call
  | 'punctuation' // Brackets and commas: ( ) ,
  | 'unknown'; // Unrecognised character — will receive squiggles

/** A token with its source position. */
export interface PositionedToken {
  type: TokenType;
  value: string;
  /** 0-based inclusive start index in the formula string. */
  startIndex: number;
  /** 0-based exclusive end index in the formula string. */
  endIndex: number;
}

// ─── Evaluation ───────────────────────────────────────────────────────────────

/** The result of evaluating a formula. Exactly one of `value` or `error` is non-null. */
export interface EvaluationResult {
  /** Formatted string representation of the evaluated value, or null on error. */
  value: string | null;
  /** Structured error object, or null on success. */
  error: FormulaError | null;
  /**
   * The raw BigNumber result before formatting.
   * Use this for precision-drift detection via `checkDoublePrecisionDrift`.
   */
  raw: BigNumber | null;
}

/** Result of a precision drift check. */
export interface DriftCheckResult {
  /** True when the BigNumber and double results differ by more than `epsilon`. */
  hasDrift: boolean;
  /** Human-readable relative difference, e.g. "2.3e-12". */
  driftAmount: string;
}

// ─── Dependency Graph ─────────────────────────────────────────────────────────

/**
 * Maps a formula label to the variable names it references.
 * Designed to be extended when multi-formula tracking is needed.
 *
 * @example { formula: ['rate', 'hours'] }
 */
export type DependencyGraph = Record<string, string[]>;
