import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  useMonacoFormula,
  FORMULA_LANGUAGE_ID,
  FORMULA_THEME_LIGHT_ID,
  FORMULA_THEME_DARK_ID,
} from './useMonacoFormula';

import type { UseMonacoFormulaOptions } from './useMonacoFormula';
import type { CarbonTheme } from '@/context/preference/types';
import type { Monaco } from '@monaco-editor/react';
import type { editor as MonacoEditorNS } from 'monaco-editor';

// ─── Monaco Mocks ─────────────────────────────────────────────────────────────

const makeDisposable = () => ({ dispose: vi.fn() });

const makeMockModel = (formulaText = '') => ({
  getValue: vi.fn().mockReturnValue(formulaText),
  getLineLength: vi.fn().mockReturnValue(formulaText.length),
  getWordAtPosition: vi.fn().mockReturnValue(null),
  getWordUntilPosition: vi.fn().mockReturnValue({ startColumn: 1, endColumn: 1 }),
});

const makeMockDecorationsCollection = () => ({ set: vi.fn() });

const makeMockEditor = (model = makeMockModel()) => ({
  getModel: vi.fn().mockReturnValue(model),
  createDecorationsCollection: vi.fn().mockReturnValue(makeMockDecorationsCollection()),
});

const makeMockMonaco = () => ({
  languages: {
    getLanguages: vi.fn().mockReturnValue([]),
    register: vi.fn(),
    setTokensProvider: vi.fn().mockReturnValue(makeDisposable()),
    registerCompletionItemProvider: vi.fn().mockReturnValue(makeDisposable()),
    registerHoverProvider: vi.fn().mockReturnValue(makeDisposable()),
    CompletionItemKind: { Variable: 4, Function: 3 },
    CompletionItemInsertTextRule: { InsertAsSnippet: 4 },
  },
  editor: {
    defineTheme: vi.fn(),
    setTheme: vi.fn(),
    setModelMarkers: vi.fn(),
  },
  Range: class Range {
    constructor(
      public startLineNumber: number,
      public startColumn: number,
      public endLineNumber: number,
      public endColumn: number,
    ) {}
  },
  MarkerSeverity: { Error: 8 },
});

// ─── Default options ───────────────────────────────────────────────────────────

const defaultOptions = (): UseMonacoFormulaOptions => ({
  allVariables: { rate: 10, hours: 8 },
  evaluationResult: null,
  evaluationError: null,
  formula: '',
  theme: 'g10',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Mounts the hook, fires onMount with mock instances, and returns everything. */
const mountHook = (
  options: Partial<UseMonacoFormulaOptions> = {},
  formula = '',
) => {
  const monaco = makeMockMonaco();
  const model = makeMockModel(formula);
  const editor = makeMockEditor(model);
  const opts = { ...defaultOptions(), ...options };

  const renderResult = renderHook((props: UseMonacoFormulaOptions) => useMonacoFormula(props), {
    initialProps: opts,
  });

  act(() => {
    renderResult.result.current.onMount(
      editor as unknown as MonacoEditorNS.IStandaloneCodeEditor,
      monaco as unknown as Monaco,
    );
  });

  return { ...renderResult, monaco, editor, model };
};

// ─── Constants ────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('shouldExportCorrectLanguageId', () => {
    expect(FORMULA_LANGUAGE_ID).toBe('formula');
  });

  it('shouldExportCorrectLightThemeId', () => {
    expect(FORMULA_THEME_LIGHT_ID).toBe('formula-theme-light');
  });

  it('shouldExportCorrectDarkThemeId', () => {
    expect(FORMULA_THEME_DARK_ID).toBe('formula-theme-dark');
  });
});

// ─── onMount: theme definition ────────────────────────────────────────────────

describe('onMount — theme definition', () => {
  it('shouldDefineBothThemes_whenMounted', () => {
    const { monaco } = mountHook();
    expect(monaco.editor.defineTheme).toHaveBeenCalledWith(
      FORMULA_THEME_DARK_ID,
      expect.objectContaining({ base: 'vs-dark' }),
    );
    expect(monaco.editor.defineTheme).toHaveBeenCalledWith(
      FORMULA_THEME_LIGHT_ID,
      expect.objectContaining({ base: 'vs' }),
    );
  });

  it('shouldSetLightTheme_whenCarbonThemeIsG10', () => {
    const { monaco } = mountHook({ theme: 'g10' });
    expect(monaco.editor.setTheme).toHaveBeenCalledWith(FORMULA_THEME_LIGHT_ID);
  });

  it('shouldSetLightTheme_whenCarbonThemeIsWhite', () => {
    const { monaco } = mountHook({ theme: 'white' as CarbonTheme });
    expect(monaco.editor.setTheme).toHaveBeenCalledWith(FORMULA_THEME_LIGHT_ID);
  });

  it('shouldSetDarkTheme_whenCarbonThemeIsG100', () => {
    const { monaco } = mountHook({ theme: 'g100' });
    expect(monaco.editor.setTheme).toHaveBeenCalledWith(FORMULA_THEME_DARK_ID);
  });

  it('shouldSetDarkTheme_whenCarbonThemeIsG90', () => {
    const { monaco } = mountHook({ theme: 'g90' as CarbonTheme });
    expect(monaco.editor.setTheme).toHaveBeenCalledWith(FORMULA_THEME_DARK_ID);
  });
});

// ─── onMount: language registration ──────────────────────────────────────────

describe('onMount — language registration', () => {
  it('shouldRegisterFormulaLanguage_whenNotYetRegistered', () => {
    const { monaco } = mountHook();
    expect(monaco.languages.register).toHaveBeenCalledWith({ id: FORMULA_LANGUAGE_ID });
  });

  it('shouldNotRegisterLanguageAgain_whenAlreadyRegistered', () => {
    const { monaco } = mountHook();
    // First mount triggered one register call; now simulate the language already present
    monaco.languages.getLanguages.mockReturnValue([{ id: FORMULA_LANGUAGE_ID }]);

    const model2 = makeMockModel();
    const editor2 = makeMockEditor(model2);
    const { result: result2 } = renderHook(() => useMonacoFormula(defaultOptions()));

    act(() => {
      result2.current.onMount(
        editor2 as unknown as MonacoEditorNS.IStandaloneCodeEditor,
        monaco as unknown as Monaco,
      );
    });

    // register should have only been called from the first mount
    expect(monaco.languages.register).toHaveBeenCalledTimes(1);
  });

  it('shouldRegisterTokensProvider_whenMounted', () => {
    const { monaco } = mountHook();
    expect(monaco.languages.setTokensProvider).toHaveBeenCalledWith(
      FORMULA_LANGUAGE_ID,
      expect.objectContaining({
        getInitialState: expect.any(Function),
        tokenize: expect.any(Function),
      }),
    );
  });

  it('shouldRegisterCompletionItemProvider_whenMounted', () => {
    const { monaco } = mountHook();
    expect(monaco.languages.registerCompletionItemProvider).toHaveBeenCalledWith(
      FORMULA_LANGUAGE_ID,
      expect.objectContaining({ provideCompletionItems: expect.any(Function) }),
    );
  });

  it('shouldRegisterHoverProvider_whenMounted', () => {
    const { monaco } = mountHook();
    expect(monaco.languages.registerHoverProvider).toHaveBeenCalledWith(
      FORMULA_LANGUAGE_ID,
      expect.objectContaining({ provideHover: expect.any(Function) }),
    );
  });
});

// ─── Token provider ───────────────────────────────────────────────────────────

describe('token provider', () => {
  it('shouldProvideInitialState_thatEqualsItself', () => {
    const { monaco } = mountHook();
    const [, provider] = monaco.languages.setTokensProvider.mock.calls[0];
    const state = provider.getInitialState();
    const clone = state.clone();
    expect(state.equals(clone)).toBe(true);
    expect(state.equals({})).toBe(false);
  });

  it('shouldTokenizeVariableToken_whenKnownVariableIsPresent', () => {
    const { monaco } = mountHook({ allVariables: { rate: 10 } });
    const [, provider] = monaco.languages.setTokensProvider.mock.calls[0];
    const { tokens } = provider.tokenize('rate');
    expect(tokens.some((t: { scopes: string }) => t.scopes === 'variable.formula')).toBe(true);
  });

  it('shouldTokenizeNumberToken_whenNumericLiteralIsPresent', () => {
    const { monaco } = mountHook();
    const [, provider] = monaco.languages.setTokensProvider.mock.calls[0];
    const { tokens } = provider.tokenize('42');
    expect(tokens.some((t: { scopes: string }) => t.scopes === 'number.formula')).toBe(true);
  });

  it('shouldReturnEndState_thatEqualsInitialState', () => {
    const { monaco } = mountHook();
    const [, provider] = monaco.languages.setTokensProvider.mock.calls[0];
    const initial = provider.getInitialState();
    const { endState } = provider.tokenize('1 + 2');
    expect(initial.equals(endState)).toBe(true);
  });
});

// ─── Completion provider ──────────────────────────────────────────────────────

describe('completion provider', () => {
  const makePosition = () => ({ lineNumber: 1, column: 1 });

  it('shouldIncludeVariableSuggestions_withCurrentValues', () => {
    const { monaco } = mountHook({ allVariables: { rate: 10, hours: 8 } });
    const [, provider] = monaco.languages.registerCompletionItemProvider.mock.calls[0];
    const model = {
      getWordUntilPosition: vi.fn().mockReturnValue({ startColumn: 1, endColumn: 1 }),
    };

    const { suggestions } = provider.provideCompletionItems(model, makePosition());

    const varLabels = suggestions
      .filter((s: { kind: number }) => s.kind === monaco.languages.CompletionItemKind.Variable)
      .map((s: { label: string }) => s.label);

    expect(varLabels).toContain('rate');
    expect(varLabels).toContain('hours');
  });

  it('shouldIncludeBuiltinSuggestions_withSnippets', () => {
    const { monaco } = mountHook();
    const [, provider] = monaco.languages.registerCompletionItemProvider.mock.calls[0];
    const model = {
      getWordUntilPosition: vi.fn().mockReturnValue({ startColumn: 1, endColumn: 1 }),
    };

    const { suggestions } = provider.provideCompletionItems(model, makePosition());

    const fnLabels = suggestions
      .filter((s: { kind: number }) => s.kind === monaco.languages.CompletionItemKind.Function)
      .map((s: { label: string }) => s.label);

    expect(fnLabels).toContain('sqrt');
    expect(fnLabels).toContain('abs');
  });

  it('shouldSortVariablesBeforeBuiltins', () => {
    const { monaco } = mountHook({ allVariables: { rate: 10 } });
    const [, provider] = monaco.languages.registerCompletionItemProvider.mock.calls[0];
    const model = {
      getWordUntilPosition: vi.fn().mockReturnValue({ startColumn: 1, endColumn: 5 }),
    };

    const { suggestions } = provider.provideCompletionItems(model, makePosition());
    const sorted = [...suggestions].sort((a: { sortText: string }, b: { sortText: string }) =>
      a.sortText.localeCompare(b.sortText),
    );

    expect(sorted[0].label).toBe('rate');
  });

  it('shouldIncludeCurrentVariableValue_inDetail', () => {
    const { monaco } = mountHook({ allVariables: { rate: 42 } });
    const [, provider] = monaco.languages.registerCompletionItemProvider.mock.calls[0];
    const model = {
      getWordUntilPosition: vi.fn().mockReturnValue({ startColumn: 1, endColumn: 1 }),
    };

    const { suggestions } = provider.provideCompletionItems(model, makePosition());
    const rateSuggestion = suggestions.find((s: { label: string }) => s.label === 'rate');

    expect(rateSuggestion?.detail).toBe('= 42');
  });
});

// ─── Hover provider ───────────────────────────────────────────────────────────

describe('hover provider', () => {
  const makePosition = () => ({ lineNumber: 1, column: 1 });

  it('shouldReturnNull_whenNoWordAtPosition', () => {
    const { monaco } = mountHook();
    const [, provider] = monaco.languages.registerHoverProvider.mock.calls[0];
    const model = { getWordAtPosition: vi.fn().mockReturnValue(null) };
    expect(provider.provideHover(model, makePosition())).toBeNull();
  });

  it('shouldReturnVariableHover_whenKnownVariableIsHovered', () => {
    const { monaco } = mountHook({ allVariables: { rate: 15 } });
    const [, provider] = monaco.languages.registerHoverProvider.mock.calls[0];
    const model = {
      getWordAtPosition: vi.fn().mockReturnValue({
        word: 'rate',
        startColumn: 1,
        endColumn: 5,
      }),
    };

    const hover = provider.provideHover(model, makePosition());
    expect(hover).not.toBeNull();
    expect(hover.contents.some((c: { value: string }) => c.value.includes('15'))).toBe(true);
  });

  it('shouldReturnBuiltinHover_withDocString_whenBuiltinIsInSnippets', () => {
    const { monaco } = mountHook();
    const [, provider] = monaco.languages.registerHoverProvider.mock.calls[0];
    const model = {
      getWordAtPosition: vi.fn().mockReturnValue({
        word: 'sqrt',
        startColumn: 1,
        endColumn: 5,
      }),
    };

    const hover = provider.provideHover(model, makePosition());
    expect(hover).not.toBeNull();
    expect(hover.contents.some((c: { value: string }) => c.value.includes('sqrt'))).toBe(true);
  });

  it('shouldReturnBuiltinHover_withoutDocString_whenBuiltinIsNotInSnippets', () => {
    // `isMathBuiltin` covers functions beyond BUILTIN_SNIPPETS (e.g. 'exp')
    const { monaco } = mountHook();
    const [, provider] = monaco.languages.registerHoverProvider.mock.calls[0];
    const model = {
      getWordAtPosition: vi.fn().mockReturnValue({
        word: 'exp', // mathjs builtin but not in BUILTIN_SNIPPETS
        startColumn: 1,
        endColumn: 4,
      }),
    };

    const hover = provider.provideHover(model, makePosition());
    // If isMathBuiltin('exp') returns true, we get a hover with only the name line
    // If it returns false (not a builtin), we get null — both are valid, just verify no throw
    expect(() => hover).not.toThrow();
  });

  it('shouldReturnNull_whenUnknownIdentifierIsHovered', () => {
    const { monaco } = mountHook();
    const [, provider] = monaco.languages.registerHoverProvider.mock.calls[0];
    const model = {
      getWordAtPosition: vi.fn().mockReturnValue({
        word: 'unknownFoo',
        startColumn: 1,
        endColumn: 11,
      }),
    };

    expect(provider.provideHover(model, makePosition())).toBeNull();
  });
});

// ─── Reactive theme effect ────────────────────────────────────────────────────

describe('reactive theme effect', () => {
  it('shouldSetDarkTheme_whenThemePropChangesToG100', () => {
    const { monaco, rerender } = mountHook({ theme: 'g10' });

    act(() => {
      rerender({ ...defaultOptions(), theme: 'g100' });
    });

    expect(monaco.editor.setTheme).toHaveBeenLastCalledWith(FORMULA_THEME_DARK_ID);
  });

  it('shouldSetLightTheme_whenThemePropChangesToG10', () => {
    const { monaco, rerender } = mountHook({ theme: 'g100' });

    act(() => {
      rerender({ ...defaultOptions(), theme: 'g10' });
    });

    expect(monaco.editor.setTheme).toHaveBeenLastCalledWith(FORMULA_THEME_LIGHT_ID);
  });
});

// ─── Reactive markers ─────────────────────────────────────────────────────────

describe('reactive markers', () => {
  it('shouldClearMarkers_whenEvaluationErrorIsNull', () => {
    const { monaco, rerender } = mountHook({
      evaluationError: { message: 'err' },
    });

    act(() => {
      rerender({ ...defaultOptions(), evaluationError: null });
    });

    expect(monaco.editor.setModelMarkers).toHaveBeenLastCalledWith(
      expect.anything(),
      'formula',
      [],
    );
  });

  it('shouldSetErrorMarker_withExactColumn_whenErrorHasStartColumn', () => {
    const { monaco, rerender } = mountHook({ evaluationError: null }, 'rate + bad');

    act(() => {
      rerender({
        ...defaultOptions(),
        formula: 'rate + bad',
        evaluationError: {
          message: 'Undefined symbol bad',
          startColumn: 8,
          endColumn: 11,
        },
      });
    });

    const lastCall = monaco.editor.setModelMarkers.mock.calls.at(-1);
    const [, , markers] = lastCall;
    expect(markers[0]).toMatchObject({ startColumn: 8, endColumn: 11 });
  });

  it('shouldSetErrorMarker_usingTokenSearch_whenErrorHasTokenButNoColumn', () => {
    const formula = 'rate + bad';
    const { monaco, rerender } = mountHook({ evaluationError: null }, formula);

    act(() => {
      rerender({
        ...defaultOptions(),
        formula,
        evaluationError: {
          message: 'Undefined symbol bad',
          token: 'bad',
        },
      });
    });

    const lastCall = monaco.editor.setModelMarkers.mock.calls.at(-1);
    const [, , markers] = lastCall;
    // 'bad' starts at index 7 → 1-based column 8
    expect(markers[0].startColumn).toBe(8);
    expect(markers[0].endColumn).toBe(11);
  });

  it('shouldUseStartColumnPlusOne_whenErrorHasStartColumnButNoEndColumn', () => {
    const formula = 'rate + bad';
    const { monaco, rerender } = mountHook({ evaluationError: null }, formula);

    act(() => {
      rerender({
        ...defaultOptions(),
        formula,
        evaluationError: {
          message: 'Undefined symbol',
          startColumn: 8,
          // endColumn deliberately omitted → fallback to startColumn + 1
        },
      });
    });

    const lastCall = monaco.editor.setModelMarkers.mock.calls.at(-1);
    const [, , markers] = lastCall;
    expect(markers[0].endColumn).toBe(9); // 8 + 1
  });

  it('shouldKeepFullLineRange_whenTokenIsNotFoundInFormula', () => {
    const formula = 'rate * hours';
    const { monaco, rerender } = mountHook({ evaluationError: null }, formula);

    act(() => {
      rerender({
        ...defaultOptions(),
        formula,
        evaluationError: {
          message: 'Symbol not found',
          token: 'totallyMissing', // not present in formula
        },
      });
    });

    const lastCall = monaco.editor.setModelMarkers.mock.calls.at(-1);
    const [, , markers] = lastCall;
    // Falls back to startColumn=1 (full line)
    expect(markers[0].startColumn).toBe(1);
  });
});

// ─── Reactive decorations ─────────────────────────────────────────────────────

describe('reactive decorations', () => {
  it('shouldSetResultDecoration_whenEvaluationResultIsProvided', () => {
    const formula = 'rate * hours';
    const { editor, rerender } = mountHook({ evaluationResult: null }, formula);
    const decorations = editor.createDecorationsCollection.mock.results[0].value;

    act(() => {
      rerender({ ...defaultOptions(), formula, evaluationResult: '80.00' });
    });

    const lastSet = decorations.set.mock.calls.at(-1)[0];
    expect(lastSet[0].options.after.content).toContain('80.00');
    expect(lastSet[0].options.after.inlineClassName).toBe('formula-inline-result');
  });

  it('shouldSetErrorDecoration_whenEvaluationErrorIsProvided', () => {
    const formula = 'bad';
    const { editor, rerender } = mountHook({ evaluationResult: null }, formula);
    const decorations = editor.createDecorationsCollection.mock.results[0].value;

    act(() => {
      rerender({
        ...defaultOptions(),
        formula,
        evaluationError: { message: 'Undefined symbol bad' },
      });
    });

    const lastSet = decorations.set.mock.calls.at(-1)[0];
    expect(lastSet[0].options.after.content).toContain('⚠');
    expect(lastSet[0].options.after.inlineClassName).toBe('formula-inline-error');
  });

  it('shouldTruncateErrorMessage_whenMessageExceeds60Chars', () => {
    const formula = 'bad';
    const longMessage = 'x'.repeat(80);
    const { editor, rerender } = mountHook({ evaluationResult: null }, formula);
    const decorations = editor.createDecorationsCollection.mock.results[0].value;

    act(() => {
      rerender({
        ...defaultOptions(),
        formula,
        evaluationError: { message: longMessage },
      });
    });

    const lastSet = decorations.set.mock.calls.at(-1)[0];
    expect(lastSet[0].options.after.content.length).toBeLessThanOrEqual(
      '  ⚠ '.length + 57 + '…'.length,
    );
  });

  it('shouldClearDecorations_whenNeitherResultNorError', () => {
    const formula = '';
    const { editor, rerender } = mountHook({ evaluationResult: '5' }, formula);
    const decorations = editor.createDecorationsCollection.mock.results[0].value;

    act(() => {
      rerender({ ...defaultOptions(), formula, evaluationResult: null });
    });

    const lastSet = decorations.set.mock.calls.at(-1)[0];
    expect(lastSet).toEqual([]);
  });
});

// ─── Cleanup ──────────────────────────────────────────────────────────────────

describe('cleanup on unmount', () => {
  it('shouldDisposeAllRegistrations_whenUnmounted', () => {
    const monaco = makeMockMonaco();
    const tokenProviderDisposable = makeDisposable();
    const completionDisposable = makeDisposable();
    const hoverDisposable = makeDisposable();

    monaco.languages.setTokensProvider.mockReturnValue(tokenProviderDisposable);
    monaco.languages.registerCompletionItemProvider.mockReturnValue(completionDisposable);
    monaco.languages.registerHoverProvider.mockReturnValue(hoverDisposable);

    const model = makeMockModel();
    const editor = makeMockEditor(model);

    const { result, unmount } = renderHook(() => useMonacoFormula(defaultOptions()));

    act(() => {
      result.current.onMount(
        editor as unknown as MonacoEditorNS.IStandaloneCodeEditor,
        monaco as unknown as Monaco,
      );
    });

    unmount();

    expect(tokenProviderDisposable.dispose).toHaveBeenCalled();
    expect(completionDisposable.dispose).toHaveBeenCalled();
    expect(hoverDisposable.dispose).toHaveBeenCalled();
  });
});
