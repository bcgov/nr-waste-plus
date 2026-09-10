/**
 * React hook that configures Monaco Editor for formula editing and wires it
 * to the application's Carbon theme so the editor swaps between light and dark
 * palettes automatically.
 *
 * Responsibilities (one per function, per SRP):
 *  - Theme definition: Carbon-aligned light/dark Monaco themes
 *  - Language registration with AST-driven token provider
 *  - Autocompletion from known variables + mathjs builtins
 *  - Hover tooltips showing variable values
 *  - Diagnostic markers (squiggles) at exact token positions
 *  - Inline result / error decorations via Monaco's `after` option
 *
 * ### Why a separate hook?
 * Monaco concerns (editor instances, disposables, language registration) are
 * completely orthogonal to evaluation logic. Keeping them here means
 * `useFormulaEngine` stays pure and testable without a DOM/Monaco environment.
 *
 * @see {@link useFormulaEngine} for the evaluation side of the formula engine.
 */

import { useEffect, useRef, useCallback } from 'react';

import { isMathBuiltin } from './math.config';
import { tokenizeFormula } from './tokenizer';

import type { FormulaError } from './types';
import type { CarbonTheme } from '@/context/preference/types';
import type { Monaco } from '@monaco-editor/react';
import type { editor as MonacoEditorNS, IDisposable, Position } from 'monaco-editor';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Monaco language identifier used when registering and referencing the formula language. */
export const FORMULA_LANGUAGE_ID = 'formula' as const;

/** Monaco theme identifier for the Carbon light-mode palette (g10 / white). */
export const FORMULA_THEME_LIGHT_ID = 'formula-theme-light' as const;

/** Monaco theme identifier for the Carbon dark-mode palette (g90 / g100). */
export const FORMULA_THEME_DARK_ID = 'formula-theme-dark' as const;

/**
 * Maps our internal `TokenType` values to Monaco token scope strings.
 * The scope strings are referenced in the theme definition below.
 *
 * Colour contract (must match the theme):
 *   variable  → Light mode (Color: #0073E6) Dark Mode (Color: #5CADFF)  — user-defined parameters
 *   number    → Light mode (Color: #007B00) Dark Mode (Color: #66AF65)  — numeric literals
 *   operator  → Light mode (Color: #726e6e) Dark Mode (Color: #cac5c4)  — arithmetic operators
 *   function  → Light mode (Color: #8a3ffc) Dark Mode (Color: #d4bbff)  — mathjs built-ins
 *   punctuation → Light mode (Color: #697077) Dark Mode (Color: #c1c7cd)
 *   unknown   → Light mode (Color: #E72000) Dark Mode (Color: #FF9681)  — with underline
 */
const TOKEN_SCOPE: Record<string, string> = {
  variable: 'variable.formula',
  number: 'number.formula',
  operator: 'operator.formula',
  function: 'support.function.formula',
  punctuation: 'punctuation.formula',
  unknown: 'invalid.illegal.formula',
};

/** mathjs built-in snippets offered in autocomplete. */
const BUILTIN_SNIPPETS: ReadonlyArray<{ label: string; snippet: string; doc: string }> = [
  { label: 'sqrt', snippet: 'sqrt($1)', doc: 'Square root' },
  { label: 'abs', snippet: 'abs($1)', doc: 'Absolute value' },
  { label: 'round', snippet: 'round($1)', doc: 'Round to nearest integer' },
  { label: 'floor', snippet: 'floor($1)', doc: 'Round down' },
  { label: 'ceil', snippet: 'ceil($1)', doc: 'Round up' },
  { label: 'pow', snippet: 'pow($1, $2)', doc: 'Power: pow(base, exponent)' },
  { label: 'log', snippet: 'log($1)', doc: 'Natural logarithm' },
  { label: 'log10', snippet: 'log10($1)', doc: 'Base-10 logarithm' },
  { label: 'min', snippet: 'min($1, $2)', doc: 'Minimum of two values' },
  { label: 'max', snippet: 'max($1, $2)', doc: 'Maximum of two values' },
  { label: 'sin', snippet: 'sin($1)', doc: 'Sine (radians)' },
  { label: 'cos', snippet: 'cos($1)', doc: 'Cosine (radians)' },
  { label: 'pi', snippet: 'pi', doc: 'Mathematical constant π ≈ 3.14159…' },
  { label: 'e', snippet: 'e', doc: "Euler's number ≈ 2.71828…" },
];

/**
 * Resolves a Carbon theme name to the corresponding Monaco theme identifier.
 *
 * `g90` and `g100` map to the dark palette; `white` and `g10` map to light.
 *
 * @param theme - The active Carbon theme from `useTheme()`.
 * @returns The Monaco theme identifier to pass to `monaco.editor.setTheme()`.
 */
const CARBON_TO_MONACO_THEME = (
  theme: CarbonTheme,
): typeof FORMULA_THEME_DARK_ID | typeof FORMULA_THEME_LIGHT_ID =>
  theme === 'g90' || theme === 'g100' ? FORMULA_THEME_DARK_ID : FORMULA_THEME_LIGHT_ID;

// ─── FormulaTokenState ────────────────────────────────────────────────────────

/**
 * Minimal Monaco token state for a stateless, single-line language.
 * Lives at module scope to avoid re-creating the class on every `registerLanguage` call.
 * Duck-typed to satisfy `monaco.languages.IState` structurally.
 */
class FormulaTokenState {
  clone(): FormulaTokenState {
    return new FormulaTokenState();
  }
  equals(other: unknown): boolean {
    return other instanceof FormulaTokenState;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Options accepted by {@link useMonacoFormula}.
 *
 * All reactive values are kept in sync via mutable refs inside the hook —
 * providers read from the ref, not the prop, so they never need to
 * re-register when values change at runtime.
 */
export interface UseMonacoFormulaOptions {
  /** Merged variable scope (fixed + dynamic). */
  allVariables: Record<string, number>;
  /** Formatted evaluation result string, or `null` when there is no result yet. */
  evaluationResult: string | null;
  /** Structured evaluation error, or `null` when the formula is valid. */
  evaluationError: FormulaError | null;
  /** Current formula text — kept in the hook only for provider context. */
  formula: string;
  /** Active Carbon theme; drives the Monaco light/dark theme swap reactively. */
  theme: CarbonTheme;
}

/**
 * Value returned by {@link useMonacoFormula}.
 */
export interface UseMonacoFormulaReturn {
  /**
   * Callback to pass to `<Editor onMount={onMount} />`.
   *
   * On first call it defines both custom themes, registers the formula
   * language (idempotent), wires up completions and hover, then applies
   * the current Carbon-derived Monaco theme.
   */
  onMount: (editor: MonacoEditorNS.IStandaloneCodeEditor, monaco: Monaco) => void;
}

// ─── Singleton Provider Registry ─────────────────────────────────────────────

/**
 * Reference-counted singleton for global Monaco providers (language, tokens,
 * completions, hover). Providers are registered once when the first
 * FormulaInput mounts and disposed only when the last one unmounts.
 *
 * This prevents the bug where unmounting one FormulaInput instance disposes
 * providers still needed by other mounted instances.
 */
let providerRefCount = 0;
let sharedDisposables: IDisposable[] = [];

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Configures a Monaco Editor instance for formula editing.
 *
 * Registers the `formula` language, its Carbon-aligned themes, completion
 * providers, hover tooltips, error markers, and inline result decorations.
 * Global providers (language, tokens, completions, hover) are reference-counted
 * and shared across all FormulaInput instances — they are only disposed when
 * the last instance unmounts.
 *
 * Theme changes (via {@link UseMonacoFormulaOptions.theme}) are reflected
 * immediately in the editor without re-mounting.
 *
 * @param options - See {@link UseMonacoFormulaOptions}.
 * @returns An `onMount` callback to pass directly to `@monaco-editor/react`'s `<Editor />`.
 *
 * @example
 * ```tsx
 * const { onMount } = useMonacoFormula({ allVariables, evaluationResult, evaluationError, formula, theme });
 * return <Editor onMount={onMount} language={FORMULA_LANGUAGE_ID} />;
 * ```
 */
export function useMonacoFormula({
  allVariables,
  evaluationResult,
  evaluationError,
  formula: _formula,
  theme,
}: UseMonacoFormulaOptions): UseMonacoFormulaReturn {
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<MonacoEditorNS.IStandaloneCodeEditor | null>(null);
  const instanceDisposablesRef = useRef<IDisposable[]>([]);
  const decorationsRef = useRef<MonacoEditorNS.IEditorDecorationsCollection | null>(null);

  /**
   * Mutable ref for variables — providers close over this ref, not the
   * prop value, so they always read the latest state without re-registering.
   *
   * All instances share the same ref so that the singleton providers read
   * the latest variables from whichever instance last updated.
   */
  const variablesRef = useRef<Record<string, number>>(allVariables);
  useEffect(() => {
    variablesRef.current = allVariables;
  }, [allVariables]);

  /** Mutable ref for the active theme — same pattern as variablesRef. */
  const themeRef = useRef<CarbonTheme>(theme);
  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  /**
   * Mutable refs for the latest evaluation state.
   * `onMount` reads from these refs so that markers and decorations are
   * applied with the current error/result at the moment the editor mounts,
   * not with the stale `null` placeholders it would otherwise receive.
   */
  const evaluationErrorRef = useRef<FormulaError | null>(evaluationError);
  useEffect(() => {
    evaluationErrorRef.current = evaluationError;
  }, [evaluationError]);

  const evaluationResultRef = useRef<string | null>(evaluationResult);
  useEffect(() => {
    evaluationResultRef.current = evaluationResult;
  }, [evaluationResult]);

  // ── Theme Definition ─────────────────────────────────────────────────────────

  /**
   * Defines the light and dark Monaco themes for the formula language.
   * Called once on mount — `defineTheme` is idempotent so StrictMode is safe.
   */
  const defineThemes = useCallback((monaco: Monaco) => {
    // Carbon g100 dark-mode palette
    monaco.editor.defineTheme(FORMULA_THEME_DARK_ID, {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'variable.formula', foreground: '5cadff' },
        { token: 'number.formula', foreground: '66af65' },
        { token: 'operator.formula', foreground: 'cac5c4', fontStyle: 'bold' },
        { token: 'support.function.formula', foreground: 'd4bbff' },
        { token: 'punctuation.formula', foreground: 'c1c7cd' },
        { token: 'invalid.illegal.formula', foreground: 'FF9681', fontStyle: 'underline' },
      ],
      colors: {
        // Carbon g100 $background token
        'editor.background': '#161616',
      },
    });

    // Carbon g10 / white light-mode palette
    monaco.editor.defineTheme(FORMULA_THEME_LIGHT_ID, {
      base: 'vs',
      inherit: true,
      rules: [
        { token: 'variable.formula', foreground: '0073e6' },
        { token: 'number.formula', foreground: '007b00' },
        { token: 'operator.formula', foreground: '726e6e', fontStyle: 'bold' },
        { token: 'support.function.formula', foreground: '8a3ffc' },
        { token: 'punctuation.formula', foreground: '697077' },
        { token: 'invalid.illegal.formula', foreground: 'e72000', fontStyle: 'underline' },
      ],
      colors: {
        // Carbon g10 $field-01 token
        'editor.background': '#F4F4F4',
      },
    });
  }, []);

  // ── Language Registration ─────────────────────────────────────────────────────

  /**
   * Registers the "formula" language and AST-driven token provider.
   * Guarded against double-registration in StrictMode and via the
   * singleton ref-count (only the first instance registers globally).
   */
  const registerLanguage = useCallback((monaco: Monaco) => {
    const alreadyRegistered = monaco.languages
      .getLanguages()
      .some((l: unknown) => (l as { id: string }).id === FORMULA_LANGUAGE_ID);

    if (!alreadyRegistered) {
      monaco.languages.register({ id: FORMULA_LANGUAGE_ID });
    }

    // ── Token provider (AST-driven) ────────────────────────────────────────
    // We use a manual ITokensProvider (not Monarch) so that our AST-aware
    // `tokenizeFormula` function drives classification, not regex rules.
    // Push to sharedDisposables — this is a global provider shared across instances.
    sharedDisposables.push(
      monaco.languages.setTokensProvider(FORMULA_LANGUAGE_ID, {
        getInitialState: () => new FormulaTokenState(),
        tokenize: (line: string) => {
          const knownVars = new Set(Object.keys(variablesRef.current));
          const tokens = tokenizeFormula(line, knownVars);
          return {
            tokens: tokens.map((t) => ({
              startIndex: t.startIndex,
              scopes: TOKEN_SCOPE[t.type] ?? 'source.formula',
            })),
            endState: new FormulaTokenState(),
          };
        },
      }),
    );
  }, []);

  // ── Autocomplete ──────────────────────────────────────────────────────────────

  /**
   * Provides variable names (with current values) and mathjs built-in snippets
   * as completion suggestions. Triggered on identifier characters.
   * Pushes to sharedDisposables — global provider shared across instances.
   */
  const registerCompletions = useCallback((monaco: Monaco) => {
    sharedDisposables.push(
      monaco.languages.registerCompletionItemProvider(FORMULA_LANGUAGE_ID, {
        triggerCharacters: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split(''),
        provideCompletionItems(model: MonacoEditorNS.ITextModel, position: Position) {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          // Variable suggestions — show current value in detail
          const varSuggestions = Object.entries(variablesRef.current).map(([name, value]) => ({
            label: name,
            kind: monaco.languages.CompletionItemKind.Variable,
            detail: `= ${value}`,
            documentation: {
              value: `**${name}** — current value: \`${value}\``,
              isTrusted: false,
            },
            insertText: name,
            range,
            sortText: `0_${name}`, // Variables sort before builtins
          }));

          // Built-in function snippets
          const builtinSuggestions = BUILTIN_SNIPPETS.map((b) => ({
            label: b.label,
            kind: monaco.languages.CompletionItemKind.Function,
            detail: b.doc,
            documentation: { value: `**${b.label}** — ${b.doc}`, isTrusted: false },
            insertText: b.snippet,
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            range,
            sortText: `1_${b.label}`, // Builtins sort after variables
          }));

          return { suggestions: [...varSuggestions, ...builtinSuggestions] };
        },
      }),
    );
  }, []);

  // ── Hover Provider ────────────────────────────────────────────────────────────

  /**
   * When the user hovers over a variable name, shows its current value.
   * When hovering a mathjs built-in, shows a brief description.
   * Pushes to sharedDisposables — global provider shared across instances.
   */
  const registerHover = useCallback((monaco: Monaco) => {
    sharedDisposables.push(
      monaco.languages.registerHoverProvider(FORMULA_LANGUAGE_ID, {
        provideHover(model: MonacoEditorNS.ITextModel, position: Position) {
          const word = model.getWordAtPosition(position);
          if (!word) return null;

          const name = word.word;
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          // User variable — show name + live value
          if (name in variablesRef.current) {
            const value = variablesRef.current[name];
            return {
              range,
              contents: [
                { value: `**${name}** _(variable)_` },
                { value: `Current value: \`${value}\`` },
              ],
            };
          }

          // mathjs built-in — show the function name
          if (isMathBuiltin(name)) {
            const builtin = BUILTIN_SNIPPETS.find((b) => b.label === name);
            return {
              range,
              contents: [
                { value: `**${name}** _(mathjs built-in)_` },
                ...(builtin ? [{ value: builtin.doc }] : []),
              ],
            };
          }

          // Unknown identifier — return null; a tooltip for every partial word is noisy
          return null;
        },
      }),
    );
  }, []);

  // ── Diagnostic Markers ────────────────────────────────────────────────────────

  /**
   * Sets Monaco error markers (red squiggles) at the exact token position.
   *
   * Position resolution priority:
   * 1. `error.startColumn` / `error.endColumn` when mathjs provides them.
   * 2. A substring search for `error.token` in the formula text.
   * 3. The full line as fallback.
   *
   * Passing `null` clears any existing markers.
   *
   * @param monaco - The Monaco namespace obtained from `onMount`.
   * @param editor - The standalone editor instance.
   * @param error - The structured formula error, or `null` to clear markers.
   */
  const updateMarkers = useCallback(
    (monaco: Monaco, editor: MonacoEditorNS.IStandaloneCodeEditor, error: FormulaError | null) => {
      const model = editor.getModel();
      if (!model) return;

      if (!error) {
        monaco.editor.setModelMarkers(model, 'formula', []);
        return;
      }

      const formulaText = model.getValue();
      const lineLength = model.getLineLength(1) + 1; // 1-based, exclusive

      let startColumn = 1;
      let endColumn = lineLength;

      if (error.startColumn != null) {
        // mathjs provided an exact position
        startColumn = error.startColumn;
        endColumn = error.endColumn ?? startColumn + 1;
      } else if (error.token) {
        // Search the formula text for the offending token name
        const idx = formulaText.indexOf(error.token);
        if (idx >= 0) {
          startColumn = idx + 1; // 1-based
          endColumn = idx + error.token.length + 1;
        }
      }

      monaco.editor.setModelMarkers(model, 'formula', [
        {
          severity: monaco.MarkerSeverity.Error,
          message: error.message,
          startLineNumber: 1,
          startColumn,
          endLineNumber: 1,
          endColumn,
        },
      ]);
    },
    [],
  );

  // ── Inline Decorations ────────────────────────────────────────────────────────

  /**
   * Renders ghost-text inline after the last character of the formula.
   *
   * - Success: `"  → 42.00"` with class `formula-inline-result`
   * - Error:   `"  ⚠ …"`    with class `formula-inline-error` (truncated at 60 chars)
   * - Neither: clears the decoration collection
   *
   * Uses Monaco's `after` decoration option (available since Monaco 0.36).
   *
   * @param monaco - The Monaco namespace obtained from `onMount`.
   * @param editor - The standalone editor instance.
   * @param result - The formatted evaluation result string, or `null`.
   * @param error - The structured formula error, or `null`.
   */
  const updateDecorations = useCallback(
    (
      monaco: Monaco,
      editor: MonacoEditorNS.IStandaloneCodeEditor,
      result: string | null,
      error: FormulaError | null,
    ) => {
      const model = editor.getModel();
      if (!model) return;

      decorationsRef.current ??= editor.createDecorationsCollection([]);

      const lineLength = model.getLineLength(1);
      const endCol = lineLength + 1; // place decoration after last char

      if (result !== null && !error) {
        decorationsRef.current.set([
          {
            range: new monaco.Range(1, endCol, 1, endCol),
            options: {
              after: {
                content: `  → ${result}`,
                inlineClassName: 'formula-inline-result',
              },
            },
          },
        ]);
      } else if (error && lineLength > 0) {
        // Truncate long error messages in the inline view
        const short = error.message.length > 60 ? `${error.message.slice(0, 57)}…` : error.message;

        decorationsRef.current.set([
          {
            range: new monaco.Range(1, endCol, 1, endCol),
            options: {
              after: {
                content: `  ⚠ ${short}`,
                inlineClassName: 'formula-inline-error',
              },
            },
          },
        ]);
      } else {
        decorationsRef.current.set([]);
      }
    },
    [],
  );

  // ── onMount ───────────────────────────────────────────────────────────────────

  /**
   * Called once by `<Editor onMount={onMount} />`.
   * Wires up all Monaco capabilities and applies the initial state.
   * Global providers (language, tokens, completions, hover) are only
   * registered once via the singleton ref-count.
   */
  const onMount = useCallback(
    (editor: MonacoEditorNS.IStandaloneCodeEditor, monaco: Monaco) => {
      monacoRef.current = monaco;
      editorRef.current = editor;

      defineThemes(monaco);

      // Only register global providers on the first instance
      if (providerRefCount === 0) {
        registerLanguage(monaco);
        registerCompletions(monaco);
        registerHover(monaco);
      }
      providerRefCount += 1;

      monaco.editor.setTheme(CARBON_TO_MONACO_THEME(themeRef.current));

      // Use the refs (not hardcoded null) so that if the formula already has
      // an error or a result when the editor first mounts, the squiggle and
      // inline decoration are rendered immediately without waiting for the
      // next evaluation cycle.
      updateMarkers(monaco, editor, evaluationErrorRef.current);
      updateDecorations(monaco, editor, evaluationResultRef.current, evaluationErrorRef.current);
    },
    [
      defineThemes,
      registerLanguage,
      registerCompletions,
      registerHover,
      updateMarkers,
      updateDecorations,
    ],
  );

  // ── Reactive Updates ──────────────────────────────────────────────────────────

  useEffect(() => {
    const monaco = monacoRef.current;
    const editor = editorRef.current;
    if (!monaco || !editor) return;

    updateMarkers(monaco, editor, evaluationError);
    updateDecorations(monaco, editor, evaluationResult, evaluationError);
  }, [evaluationError, evaluationResult, updateMarkers, updateDecorations]);

  useEffect(() => {
    if (!monacoRef.current) return;
    monacoRef.current.editor.setTheme(CARBON_TO_MONACO_THEME(theme));
  }, [theme]);

  // ── Cleanup ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      // Dispose per-instance disposables (markers, decorations)
      instanceDisposablesRef.current.forEach((d: IDisposable) => d.dispose());
      instanceDisposablesRef.current = [];

      // Decrement the singleton ref-count; only dispose shared providers
      // (language, tokens, completions, hover) when the last instance unmounts.
      providerRefCount -= 1;
      if (providerRefCount <= 0) {
        providerRefCount = 0;
        sharedDisposables.forEach((d: IDisposable) => d.dispose());
        sharedDisposables = [];
      }
    };
  }, []);

  return { onMount };
}
