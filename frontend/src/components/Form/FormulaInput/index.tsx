/**
 * FormulaInput — A Monaco-powered math formula editor with BigNumber evaluation,
 * live inline previews, and Carbon Design System styling.
 *
 * Quick reference:
 *  - Fixed params come from an API (e.g. TanStack Query) and cannot be changed here.
 *  - Dynamic params are mutable at runtime (added/removed by the user upstream).
 *  - The formula is evaluated live via mathjs in BigNumber mode (64-digit precision).
 *  - Results are shown in a ReadonlyInput below the editor.
 *  - Variable names are displayed as Carbon Tags below the result.
 *  - A dependency graph shows which variables the current formula actually uses.
 */

import Editor from '@monaco-editor/react';
import React, { useCallback, useId, useMemo, useState } from 'react';

import DependencyGraph from './DependencyGraph';
import { useFormulaEngine } from './useFormulaEngine';
import { useMonacoFormula, FORMULA_LANGUAGE_ID } from './useMonacoFormula';
import VariablePanel from './VariablePanel';

import type { OnMount } from '@monaco-editor/react';

import './index.scss';
import ReadonlyInput from '@/components/Form/ReadonlyInput';
import { useTheme } from '@/context/theme/useTheme';

/** BC Sans is the project's primary typeface — update here if the design token changes. */
const EDITOR_FONT_FAMILY = '"BC Sans", monospace';

/** Minimum editor height in pixels — roughly one line of text with padding. */
const MIN_EDITOR_HEIGHT = 56;

export interface FormulaInputProps {
  /**
   * Stable HTML id prefix for this instance.
   * Derived ids (`${id}-formula-label`, `${id}-evaluated-result`) are applied to
   * internal elements so multiple FormulaInput instances on the same page remain
   * accessible and free of duplicate ids. Falls back to a React-generated uid.
   */
  id?: string;

  /**
   * Human-readable label for the `<section>` landmark.
   * When multiple FormulaInput components appear on the same page, pass distinct
   * labels (e.g. `"Rate formula"`, `"Discount formula"`) so screen-reader users
   * can navigate between them unambiguously.
   * @default 'Formula editor'
   */
  ariaLabel?: string;

  /**
   * Fixed parameters from the API (e.g. via TanStack Query).
   * These take precedence over `dynamicParams` in case of name collision —
   * server-authoritative values always win.
   *
   * @example { tax_rate: 0.15, base_price: 100 }
   */
  fixedParams: Record<string, number>;

  /**
   * Parameters that the user can add or remove at runtime.
   * Variable names here are immediately available in autocomplete.
   *
   * @example { quantity: 5, discount: 0.1 }
   */
  dynamicParams: Record<string, number>;

  /**
   * Starting formula shown when the editor first mounts.
   * **Note:** this value is read once on mount and is not reactive — changing it
   * after the component mounts will have no effect. To reset the formula after
   * mount, remount the component with a new `key`.
   * @default ''
   */
  initialFormula?: string;

  /**
   * Called every time the formula text changes.
   * The raw string is passed through without sanitisation — the consumer
   * should validate/persist as needed.
   *
   * The formula is already validated by `useFormulaEngine`; listen to the
   * evaluation result if you need to gate submission on correctness.
   */
  onChange?: (formula: string) => void;

  /**
   * Optional flags to toggle display of certain UI elements.
   * Useful for advanced use cases where you want to hide the result as the result
   * is already displayed inside the formula editor itself.
   *
   * Note: errors and precision warnings are **always** shown in the helper text
   * area below the editor regardless of this flag.
   */
  displayResult?: boolean;

  /**
   * Whether to show the dependency graph (which variables the formula uses). You might
   * want to hide this if the formula is simple or if you already display variable usage
   * prominently in the UI elsewhere (e.g. in a tooltip on the formula editor).
   */
  displayDependencyGraph?: boolean;

  /**
   * When `true`, the formula editor is rendered in read-only mode.
   * All editing interactions are disabled; the formula can still be selected and copied.
   */
  readOnly?: boolean;

  /**
   * HTML `name` for native form integration.
   * When provided, a hidden `<input type="hidden">` carrying the current formula value
   * is rendered so the formula is included in `FormData` on form submission.
   */
  name?: string;
}

/**
 * FormulaInput
 *
 * A billing-grade formula editor combining Monaco Editor with mathjs BigNumber
 * evaluation. Designed to author formulas like `rate * hours + bonus` that will
 * be stored in a database and re-evaluated on a Java backend.
 *
 * ### Architecture
 * ```
 * FormulaInput (this file)
 *   ├── useFormulaEngine  — evaluation, dependency graph, precision check
 *   └── useMonacoFormula  — editor configuration (completions, hover, markers)
 *         └── utils.ts    — pure functions (parse, tokenize, evaluate)
 * ```
 *
 * ### Safety
 * - mathjs evaluates in a sandboxed scope; no access to browser/Node globals.
 * - Variable names are validated against the declared scope before evaluation.
 * - Formula strings should be stored as-is (they are plain text, not code).
 *   Never `eval()` them server-side — use exp4j or equivalent.
 */
export const FormulaInput: React.FC<FormulaInputProps> = ({
  id: idProp,
  ariaLabel = 'Formula editor',
  fixedParams,
  dynamicParams,
  initialFormula = 'basePrice / 10.32 * sqrt(area) + totoro', //TODO: This is just a test value, the real default should be '' or something equally innocuous
  onChange,
  displayResult = true,
  displayDependencyGraph = true,
  readOnly = false,
  name,
}) => {
  // ── Stable id ───────────────────────────────────────────────────────────────
  const generatedId = useId();
  const id = idProp ?? generatedId;

  // ── Editor height (dynamic) ─────────────────────────────────────────────────
  const [editorHeight, setEditorHeight] = useState(MIN_EDITOR_HEIGHT);

  // ── Business logic ──────────────────────────────────────────────────────────
  const { formula, result, usedVariables, mergedScope, setFormula } = useFormulaEngine({
    fixedParams,
    dynamicParams,
    initialFormula,
    onChange,
  });

  // ── Monaco configuration ────────────────────────────────────────────────────
  const { theme } = useTheme();
  const { onMount: formulaOnMount } = useMonacoFormula({
    allVariables: mergedScope,
    evaluationResult: result.value,
    evaluationError: result.error,
    formula,
    theme,
  });

  // ── Stable handlers ─────────────────────────────────────────────────────────
  const handleEditorChange = useCallback(
    (value: string | undefined) => setFormula(value ?? ''),
    [setFormula],
  );

  const handleMount: OnMount = useCallback(
    (editorInstance, monaco) => {
      formulaOnMount(editorInstance, monaco);
      const updateHeight = () => {
        setEditorHeight(Math.max(MIN_EDITOR_HEIGHT, editorInstance.getContentHeight()));
      };
      editorInstance.onDidContentSizeChange(updateHeight);
      updateHeight();
    },
    [formulaOnMount],
  );

  // ── Stable Monaco options ───────────────────────────────────────────────────
  const editorOptions = useMemo(
    () => ({
      // Single-line feel — hide line numbers and unnecessary chrome
      lineNumbers: 'off' as const,
      glyphMargin: true,
      folding: false,
      lineDecorationsWidth: 0,
      lineNumbersMinChars: 0,
      // Layout
      automaticLayout: true,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'off' as const,
      overviewRulerLanes: 0,
      scrollbar: { vertical: 'hidden' as const, horizontal: 'hidden' as const },
      // Editing experience
      readOnly,
      suggestOnTriggerCharacters: true,
      quickSuggestions: { other: true, comments: false, strings: false },
      parameterHints: { enabled: true },
      fontSize: 16,
      fontFamily: EDITOR_FONT_FAMILY,
      // Visual
      renderLineHighlight: 'none' as const,
      contextmenu: false,
      padding: { top: 10, bottom: 10 },
    }),
    [readOnly],
  );

  // ── Derived display data (gated — only computed when the section is visible) ─
  const fixedEntries = useMemo(
    () => (displayDependencyGraph ? Object.entries(fixedParams) : []),
    [displayDependencyGraph, fixedParams],
  );
  const dynamicEntries = useMemo(
    () => (displayDependencyGraph ? Object.entries(dynamicParams) : []),
    [displayDependencyGraph, dynamicParams],
  );
  const usedSet = useMemo(
    () => (displayDependencyGraph ? new Set(usedVariables) : new Set<string>()),
    [displayDependencyGraph, usedVariables],
  );
  const fixedNames = useMemo(
    () => (displayDependencyGraph ? new Set(Object.keys(fixedParams)) : new Set<string>()),
    [displayDependencyGraph, fixedParams],
  );
  const dynamicNames = useMemo(
    () => (displayDependencyGraph ? new Set(Object.keys(dynamicParams)) : new Set<string>()),
    [displayDependencyGraph, dynamicParams],
  );

  // ── Result display ──────────────────────────────────────────────────────────
  const resultDisplayValue = result.value ?? '';
  const isError = !!result.error;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <section className="formula-input" role="region" aria-label={ariaLabel}>
      {/* ── Monaco Editor ──────────────────────────────────────────────────── */}
      <div
        className={[
          'formula-input__editor-wrapper',
          isError && 'formula-input__editor-wrapper--invalid',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {/* The <label> id is used via aria-labelledby on the Monaco wrapper div below.
            htmlFor cannot target Monaco's auto-generated internal textarea id. */}
        <label id={`${id}-formula-label`} className="cds--label formula-input__editor-label">
          Formula
        </label>
        <div aria-labelledby={`${id}-formula-label`}>
          <Editor
            className="cds--text-area formula-input__editor"
            language={FORMULA_LANGUAGE_ID}
            value={formula}
            onChange={handleEditorChange}
            onMount={handleMount}
            height={`${editorHeight}px`}
            options={editorOptions}
            loading={
              <div
                className="formula-input__editor-skeleton"
                role="status"
                aria-busy="true"
                aria-label="Loading formula editor"
                style={{ height: `${MIN_EDITOR_HEIGHT}px` }}
              />
            }
          />
        </div>

        {/* ── Validation helper text (always shown when error present) ── */}
        {isError && (
          <div
            id={`${id}-helper-text`}
            className="cds--form__helper-text formula-input__helper-text formula-input__helper-text--error"
            role="alert"
          >
            {result.error?.message ?? 'Invalid formula'}
          </div>
        )}
      </div>

      {/* ── Hidden input for native form integration ─────────────────────────── */}
      {name && <input type="hidden" name={name} value={formula} />}

      {displayResult && (
        <>
          {/* ── Evaluated result ────────────────────────────────────────────── */}
          <div className="formula-input__result">
            <ReadonlyInput id={`${id}-evaluated-result`} label="Evaluated result">
              <output aria-label="Evaluated result">{resultDisplayValue}</output>
            </ReadonlyInput>
          </div>
        </>
      )}

      {displayDependencyGraph && (
        <>
          {/* ── Dependency graph ─────────────────────────────────────────────── */}
          <DependencyGraph
            usedVariables={usedVariables}
            mergedScope={mergedScope}
            fixedParamNames={fixedNames}
            dynamicParamNames={dynamicNames}
          />

          {/* ── Available variables ──────────────────────────────────────────── */}
          <div className="formula-input__variables" aria-label="Available variables">
            <VariablePanel
              label="Fixed parameters"
              entries={fixedEntries}
              tagType="blue"
              usedSet={usedSet}
            />
            <VariablePanel
              label="Dynamic parameters"
              entries={dynamicEntries}
              tagType="teal"
              usedSet={usedSet}
            />
          </div>
        </>
      )}
    </section>
  );
};

export default FormulaInput;
