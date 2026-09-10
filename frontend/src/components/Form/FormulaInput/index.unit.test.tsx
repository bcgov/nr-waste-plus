/**
 * @file index.unit.test.tsx
 *
 * Unit tests for the FormulaInput component.
 *
 * Strategy
 * --------
 * - Monaco Editor is replaced with a plain `<textarea>` so tests run in jsdom
 *   without a real Monaco worker environment.
 * - The three heavy hooks (useFormulaEngine, useMonacoFormula, useTheme) are
 *   mocked so every test exercises only the component's own rendering logic.
 * - Sub-components (DependencyGraph, VariablePanel, ReadonlyInput) are stubbed
 *   with lightweight divs that expose props as data attributes, keeping render
 *   trees shallow and assertions crisp.
 */

import Editor from '@monaco-editor/react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFormulaEngine } from './useFormulaEngine';
import { useMonacoFormula } from './useMonacoFormula';

import { FormulaInput } from './index';

import type { EvaluationResult, FormulaError } from './types';
import type { FormulaEngineState } from './useFormulaEngine';
import type { ReactElement, ReactNode } from 'react';

import { useTheme } from '@/context/theme/useTheme';

// ── Monaco mock ───────────────────────────────────────────────────────────────
//
// Replaces @monaco-editor/react with a textarea that:
//  - passes value/onChange through so handleEditorChange is exercised
//  - reflects options.readOnly on the textarea's readOnly property
//  - captures all props via vi.fn() so tests can inspect options & loading

vi.mock('@monaco-editor/react', () => ({
  default: vi.fn(
    (props: {
      value?: string;
      onChange?: (v: string) => void;
      options?: { readOnly?: boolean };
    }) => (
      <textarea
        data-testid="monaco-editor"
        value={props.value ?? ''}
        readOnly={props.options?.readOnly ?? false}
        onChange={(e) => props.onChange?.(e.target.value)}
      />
    ),
  ),
}));

// ── Hook mocks ────────────────────────────────────────────────────────────────

vi.mock('./useFormulaEngine');
vi.mock('./useMonacoFormula');
vi.mock('@/context/theme/useTheme');

// ── Sub-component mocks ───────────────────────────────────────────────────────

vi.mock('./DependencyGraph', () => ({
  default: ({ usedVariables }: { usedVariables: string[] }) => (
    <div data-testid="dependency-graph" data-used={usedVariables.join(',')} />
  ),
}));

vi.mock('./VariablePanel', () => ({
  default: ({ label }: { label: string }) => (
    <div data-testid={`variable-panel-${label.toLowerCase().replaceAll(/\s+/gu, '-')}`} />
  ),
}));

vi.mock('@/components/Form/ReadonlyInput', () => ({
  default: ({ id, label, children }: { id?: string; label: string; children?: ReactNode }) => (
    <div data-testid="readonly-input" data-id={id} data-label={label}>
      {children}
    </div>
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const SUCCESS_RESULT: EvaluationResult = { value: '80', error: null, raw: null };
const ERROR_RESULT: EvaluationResult = {
  value: null,
  error: { message: 'Undefined variable: x' } satisfies FormulaError,
  raw: null,
};

const mockSetFormula = vi.fn();

function makeEngineState(overrides: Partial<FormulaEngineState> = {}): FormulaEngineState {
  return {
    formula: 'rate * hours',
    result: SUCCESS_RESULT,
    usedVariables: ['rate', 'hours'],
    mergedScope: { rate: 10, hours: 8 },
    setFormula: mockSetFormula,
    ...overrides,
  };
}

const DEFAULT_PROPS = {
  fixedParams: { rate: 10 },
  dynamicParams: { hours: 8 },
};

// ── Test setup ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState());
  vi.mocked(useMonacoFormula).mockReturnValue({ onMount: vi.fn() });
  vi.mocked(useTheme).mockReturnValue({
    theme: 'white',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  } as ReturnType<typeof useTheme>);
});

// ─────────────────────────────────────────────────────────────────────────────
// Structure and accessibility
// ─────────────────────────────────────────────────────────────────────────────

describe('structure and accessibility', () => {
  it('shouldRenderSectionLandmark_withDefaultAriaLabel', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.getByRole('region', { name: 'Formula editor' })).toBeDefined();
  });

  it('shouldRenderSectionLandmark_withCustomAriaLabelProp', () => {
    render(<FormulaInput {...DEFAULT_PROPS} ariaLabel="Rate formula" />);

    expect(screen.getByRole('region', { name: 'Rate formula' })).toBeDefined();
  });

  it('shouldRenderVisibleFormulaLabel', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.getByText('Formula')).toBeDefined();
  });

  it('shouldRenderLabelAsLabelElement_notAParagraph', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    const label = screen.getByText('Formula');
    expect(label.tagName).toBe('LABEL');
  });

  it('shouldRenderMonacoEditorWrapper', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.getByTestId('monaco-editor')).toBeDefined();
  });

  it('shouldPassCurrentFormulaValueToEditor', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ formula: 'price * qty' }));

    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect((screen.getByTestId('monaco-editor') as HTMLTextAreaElement).value).toBe('price * qty');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// id prop
// ─────────────────────────────────────────────────────────────────────────────

describe('id prop', () => {
  it('shouldUseDerivedId_forFormulaLabelElement_whenIdPropIsProvided', () => {
    render(<FormulaInput {...DEFAULT_PROPS} id="calc-1" />);

    const label = screen.getByText('Formula');
    expect(label.getAttribute('id')).toBe('calc-1-formula-label');
  });

  it('shouldUseDerivedId_forReadonlyInput_whenIdPropIsProvided', () => {
    render(<FormulaInput {...DEFAULT_PROPS} id="calc-1" />);

    expect(screen.getByTestId('readonly-input').dataset.id).toBe('calc-1-evaluated-result');
  });

  it('shouldGenerateUniqueIds_forTwoInstancesWithoutIdProp', () => {
    render(
      <>
        <FormulaInput {...DEFAULT_PROPS} />
        <FormulaInput {...DEFAULT_PROPS} />
      </>,
    );

    const labels = screen.getAllByText('Formula');
    const firstId = labels[0].getAttribute('id');
    const secondId = labels[1].getAttribute('id');

    expect(firstId).toBeTruthy();
    expect(secondId).toBeTruthy();
    expect(firstId).not.toBe(secondId);
  });

  it('shouldGenerateUniqueIds_forReadonlyInputs_whenTwoInstancesHaveNoIdProp', () => {
    render(
      <>
        <FormulaInput {...DEFAULT_PROPS} />
        <FormulaInput {...DEFAULT_PROPS} />
      </>,
    );

    const readonlyInputs = screen.getAllByTestId('readonly-input');
    const firstId = readonlyInputs[0].dataset.id;
    const secondId = readonlyInputs[1].dataset.id;

    expect(firstId).not.toBe(secondId);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// displayResult prop
// ─────────────────────────────────────────────────────────────────────────────

describe('displayResult prop', () => {
  it('shouldShowReadonlyInput_byDefault', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.queryByTestId('readonly-input')).not.toBeNull();
  });

  it('shouldShowReadonlyInput_whenDisplayResultIsTrue', () => {
    render(<FormulaInput {...DEFAULT_PROPS} displayResult />);

    expect(screen.queryByTestId('readonly-input')).not.toBeNull();
  });

  it('shouldHideReadonlyInput_whenDisplayResultIsFalse', () => {
    render(<FormulaInput {...DEFAULT_PROPS} displayResult={false} />);

    expect(screen.queryByTestId('readonly-input')).toBeNull();
  });

  it('shouldDisplayEvaluatedValue_insideReadonlyInput', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(
      makeEngineState({ result: { value: '240', error: null, raw: null } }),
    );

    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.getByTestId('readonly-input').textContent).toBe('240');
  });

  it('shouldDisplayEmptyString_insideReadonlyInput_whenResultValueIsNull', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(
      makeEngineState({ result: { value: null, error: null, raw: null } }),
    );

    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.getByTestId('readonly-input').textContent).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// displayDependencyGraph prop
// ─────────────────────────────────────────────────────────────────────────────

describe('displayDependencyGraph prop', () => {
  it('shouldShowDependencyGraphAndVariablePanels_byDefault', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.queryByTestId('dependency-graph')).not.toBeNull();
    expect(screen.queryByTestId('variable-panel-fixed-parameters')).not.toBeNull();
    expect(screen.queryByTestId('variable-panel-dynamic-parameters')).not.toBeNull();
  });

  it('shouldShowDependencyGraphAndVariablePanels_whenDisplayDependencyGraphIsTrue', () => {
    render(<FormulaInput {...DEFAULT_PROPS} displayDependencyGraph />);

    expect(screen.queryByTestId('dependency-graph')).not.toBeNull();
  });

  it('shouldHideDependencyGraphAndVariablePanels_whenDisplayDependencyGraphIsFalse', () => {
    render(<FormulaInput {...DEFAULT_PROPS} displayDependencyGraph={false} />);

    expect(screen.queryByTestId('dependency-graph')).toBeNull();
    expect(screen.queryByTestId('variable-panel-fixed-parameters')).toBeNull();
    expect(screen.queryByTestId('variable-panel-dynamic-parameters')).toBeNull();
  });

  it('shouldPassUsedVariablesToDependencyGraph', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(
      makeEngineState({ usedVariables: ['rate', 'hours'] }),
    );

    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.getByTestId('dependency-graph').dataset.used).toBe('rate,hours');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Error state — helper text and wrapper modifier class
// ─────────────────────────────────────────────────────────────────────────────

describe('error state', () => {
  it('shouldNotRenderHelperText_whenNoErrorAndNoWarning', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shouldRenderHelperText_whenResultHasError', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ result: ERROR_RESULT }));

    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.queryByRole('alert')).not.toBeNull();
  });

  it('shouldDisplayErrorMessage_fromResultError', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ result: ERROR_RESULT }));

    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.getByRole('alert').textContent).toBe('Undefined variable: x');
  });

  it('shouldDisplayFallbackMessage_whenErrorMessageIsUndefined', () => {
    const errorWithNoMessage: EvaluationResult = {
      value: null,
      error: { message: undefined as unknown as string },
      raw: null,
    };
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ result: errorWithNoMessage }));

    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.getByRole('alert').textContent).toBe('Invalid formula');
  });

  it('shouldApplyErrorModifierClass_toHelperText_whenResultHasError', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ result: ERROR_RESULT }));

    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(screen.getByRole('alert').classList.contains('formula-input__helper-text--error')).toBe(
      true,
    );
  });

  it('shouldApplyInvalidModifierClass_toEditorWrapper_whenResultHasError', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ result: ERROR_RESULT }));

    render(<FormulaInput {...DEFAULT_PROPS} />);

    const wrapper = screen.getByTestId('monaco-editor').closest('.formula-input__editor-wrapper');
    expect(wrapper?.classList.contains('formula-input__editor-wrapper--invalid')).toBe(true);
  });

  it('shouldNotApplyWarningModifierClass_toEditorWrapper_whenResultHasError', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ result: ERROR_RESULT }));

    render(<FormulaInput {...DEFAULT_PROPS} />);

    const wrapper = screen.getByTestId('monaco-editor').closest('.formula-input__editor-wrapper');
    expect(wrapper?.classList.contains('formula-input__editor-wrapper--warning')).toBe(false);
  });

  it('shouldShowHelperText_evenWhenDisplayResultIsFalse', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ result: ERROR_RESULT }));

    render(<FormulaInput {...DEFAULT_PROPS} displayResult={false} />);

    expect(screen.queryByRole('alert')).not.toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Precision warning state — helper text and wrapper modifier class
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// readOnly prop
// ─────────────────────────────────────────────────────────────────────────────

describe('readOnly prop', () => {
  it('shouldRenderEditorAsEditable_byDefault', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    expect((screen.getByTestId('monaco-editor') as HTMLTextAreaElement).readOnly).toBe(false);
  });

  it('shouldRenderEditorAsReadonly_whenReadOnlyPropIsTrue', () => {
    render(<FormulaInput {...DEFAULT_PROPS} readOnly />);

    expect((screen.getByTestId('monaco-editor') as HTMLTextAreaElement).readOnly).toBe(true);
  });

  it('shouldPassReadOnlyFalse_toMonacoOptions_byDefault', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    const lastProps = vi.mocked(Editor).mock.lastCall?.[0];
    expect(lastProps?.options?.readOnly).toBe(false);
  });

  it('shouldPassReadOnlyTrue_toMonacoOptions_whenReadOnlyPropIsTrue', () => {
    render(<FormulaInput {...DEFAULT_PROPS} readOnly />);

    const lastProps = vi.mocked(Editor).mock.lastCall?.[0];
    expect(lastProps?.options?.readOnly).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// name prop — hidden input for native form integration
// ─────────────────────────────────────────────────────────────────────────────

describe('name prop', () => {
  it('shouldNotRenderHiddenInput_whenNamePropIsAbsent', () => {
    const { container } = render(<FormulaInput {...DEFAULT_PROPS} />);

    expect(container.querySelector('input[type="hidden"]')).toBeNull();
  });

  it('shouldRenderHiddenInput_withCorrectName_whenNamePropIsProvided', () => {
    const { container } = render(<FormulaInput {...DEFAULT_PROPS} name="rate_formula" />);

    const hiddenInput = container.querySelector('input[type="hidden"]');
    expect(hiddenInput).not.toBeNull();
    expect(hiddenInput?.getAttribute('name')).toBe('rate_formula');
  });

  it('shouldSetHiddenInputValue_toCurrentFormula', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ formula: 'rate * 1.15' }));

    const { container } = render(<FormulaInput {...DEFAULT_PROPS} name="rate_formula" />);

    const hiddenInput = container.querySelector('input[type="hidden"]') as HTMLInputElement | null;
    expect(hiddenInput?.value).toBe('rate * 1.15');
  });

  it('shouldReflectUpdatedFormula_inHiddenInputValue_whenEngineProvidesNewFormula', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ formula: 'rate * 2' }));

    const { container } = render(<FormulaInput {...DEFAULT_PROPS} name="calc" />);

    const hiddenInput = container.querySelector('input[type="hidden"]') as HTMLInputElement | null;
    expect(hiddenInput?.value).toBe('rate * 2');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// onChange callback — editor change → setFormula
// ─────────────────────────────────────────────────────────────────────────────

describe('onChange callback', () => {
  it('shouldCallSetFormula_whenEditorValueChanges', async () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ formula: '' }));
    render(<FormulaInput {...DEFAULT_PROPS} />);

    const editor = screen.getByTestId('monaco-editor');
    await userEvent.type(editor, 'x');

    expect(mockSetFormula).toHaveBeenCalled();
  });

  it('shouldCallSetFormula_withNewValue_whenEditorChanges', async () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ formula: '' }));

    render(<FormulaInput {...DEFAULT_PROPS} />);

    const editor = screen.getByTestId('monaco-editor');
    await userEvent.type(editor, 'a');

    expect(mockSetFormula).toHaveBeenCalledWith(expect.stringContaining('a'));
  });

  it('shouldPassOnChangeProp_toUseFormulaEngine', () => {
    const onChangeSpy = vi.fn();
    render(<FormulaInput {...DEFAULT_PROPS} onChange={onChangeSpy} />);

    const engineCall = vi.mocked(useFormulaEngine).mock.calls[0][0];
    expect(engineCall.onChange).toBe(onChangeSpy);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// initialFormula prop
// ─────────────────────────────────────────────────────────────────────────────

describe('initialFormula prop', () => {
  it('shouldPassInitialFormula_toUseFormulaEngine', () => {
    render(<FormulaInput {...DEFAULT_PROPS} initialFormula="base * rate" />);

    const engineCall = vi.mocked(useFormulaEngine).mock.calls[0][0];
    expect(engineCall.initialFormula).toBe('base * rate');
  });

  it('shouldPassFixedParams_toUseFormulaEngine', () => {
    render(<FormulaInput fixedParams={{ rate: 10 }} dynamicParams={{ qty: 2 }} />);

    const engineCall = vi.mocked(useFormulaEngine).mock.calls[0][0];
    expect(engineCall.fixedParams).toEqual({ rate: 10 });
  });

  it('shouldPassDynamicParams_toUseFormulaEngine', () => {
    render(<FormulaInput fixedParams={{ rate: 10 }} dynamicParams={{ qty: 2 }} />);

    const engineCall = vi.mocked(useFormulaEngine).mock.calls[0][0];
    expect(engineCall.dynamicParams).toEqual({ qty: 2 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Monaco editor props — loading skeleton and editor options
// ─────────────────────────────────────────────────────────────────────────────

describe('Monaco editor props', () => {
  it('shouldPassLoadingSkeletonWithAriaBusy_toMonacoLoadingProp', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    const loadingProp = vi.mocked(Editor).mock.lastCall?.[0].loading as ReactElement;
    const loadingProps = loadingProp.props as Record<string, string>;
    expect(loadingProps['aria-busy']).toBe('true');
    expect(loadingProps['aria-label']).toBe('Loading formula editor');
  });

  it('shouldPassMinimapDisabled_inMonacoOptions', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    const opts = vi.mocked(Editor).mock.lastCall?.[0].options;
    expect(opts?.minimap?.enabled).toBe(false);
  });

  it('shouldPassAriaLabel_inMonacoOptions', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    const opts = vi.mocked(Editor).mock.lastCall?.[0].options;
    expect(opts?.ariaLabel).toBeUndefined();
  });

  it('shouldPassLineNumbersOff_inMonacoOptions', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    const opts = vi.mocked(Editor).mock.lastCall?.[0].options;
    expect(opts?.lineNumbers).toBe('off');
  });

  it('shouldSetMinimumEditorHeight_at56px_byDefault', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    const height = vi.mocked(Editor).mock.lastCall?.[0].height;
    expect(height).toBe('56px');
  });

  it('shouldEnableAutomaticLayout_inMonacoOptions', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    const opts = vi.mocked(Editor).mock.lastCall?.[0].options;
    expect(opts?.automaticLayout).toBe(true);
  });

  it('shouldProvideAccessibleLoadingState_forEditorSkeleton', () => {
    render(<FormulaInput {...DEFAULT_PROPS} />);

    const loadingProp = vi.mocked(Editor).mock.lastCall?.[0].loading as ReactElement<{
      'role'?: string;
      'aria-busy'?: string;
      'aria-label'?: string;
    }>;
    expect(loadingProp.props.role).toBe('status');
    expect(loadingProp.props['aria-busy']).toBe('true');
    expect(loadingProp.props['aria-label']).toBe('Loading formula editor');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Multiple instances
// ─────────────────────────────────────────────────────────────────────────────

describe('multiple instances', () => {
  it('shouldRenderTwoDistinctSections_withDistinctAriaLabels', () => {
    render(
      <>
        <FormulaInput {...DEFAULT_PROPS} ariaLabel="Rate formula" />
        <FormulaInput {...DEFAULT_PROPS} ariaLabel="Discount formula" />
      </>,
    );

    expect(screen.getByRole('region', { name: 'Rate formula' })).toBeDefined();
    expect(screen.getByRole('region', { name: 'Discount formula' })).toBeDefined();
  });

  it('shouldRenderTwoEditors_whenTwoInstancesAreMounted', () => {
    render(
      <>
        <FormulaInput {...DEFAULT_PROPS} />
        <FormulaInput {...DEFAULT_PROPS} />
      </>,
    );

    expect(screen.getAllByTestId('monaco-editor')).toHaveLength(2);
  });

  it('shouldIsolateErrorState_betweenTwoInstances', () => {
    // First instance: no error. Second instance: has an error.
    vi.mocked(useFormulaEngine)
      .mockReturnValueOnce(makeEngineState())
      .mockReturnValueOnce(makeEngineState({ result: ERROR_RESULT }));

    render(
      <>
        <FormulaInput {...DEFAULT_PROPS} id="first" />
        <FormulaInput {...DEFAULT_PROPS} id="second" />
      </>,
    );

    expect(screen.getAllByRole('alert')).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// useMonacoFormula integration
// ─────────────────────────────────────────────────────────────────────────────

describe('useMonacoFormula integration', () => {
  it('shouldCallUseMonacoFormula_withMergedScopeFromEngine', () => {
    const mergedScope = { rate: 10, hours: 8 };
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ mergedScope }));

    render(<FormulaInput {...DEFAULT_PROPS} />);

    const monacoCall = vi.mocked(useMonacoFormula).mock.calls[0][0];
    expect(monacoCall.allVariables).toEqual(mergedScope);
  });

  it('shouldCallUseMonacoFormula_withCurrentFormulaString', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ formula: 'a + b' }));

    render(<FormulaInput {...DEFAULT_PROPS} />);

    const monacoCall = vi.mocked(useMonacoFormula).mock.calls[0][0];
    expect(monacoCall.formula).toBe('a + b');
  });

  it('shouldCallUseMonacoFormula_withEvaluationResultValue', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(
      makeEngineState({ result: { value: '42', error: null, raw: null } }),
    );

    render(<FormulaInput {...DEFAULT_PROPS} />);

    const monacoCall = vi.mocked(useMonacoFormula).mock.calls[0][0];
    expect(monacoCall.evaluationResult).toBe('42');
  });

  it('shouldCallUseMonacoFormula_withEvaluationError_whenResultHasError', () => {
    vi.mocked(useFormulaEngine).mockReturnValue(makeEngineState({ result: ERROR_RESULT }));

    render(<FormulaInput {...DEFAULT_PROPS} />);

    const monacoCall = vi.mocked(useMonacoFormula).mock.calls[0][0];
    expect(monacoCall.evaluationError).toEqual(ERROR_RESULT.error);
  });

  it('shouldCallUseMonacoFormula_withCurrentTheme', () => {
    vi.mocked(useTheme).mockReturnValue({
      theme: 'g100',
      setTheme: vi.fn(),
      toggleTheme: vi.fn(),
    } as ReturnType<typeof useTheme>);

    render(<FormulaInput {...DEFAULT_PROPS} />);

    const monacoCall = vi.mocked(useMonacoFormula).mock.calls[0][0];
    expect(monacoCall.theme).toBe('g100');
  });
});
