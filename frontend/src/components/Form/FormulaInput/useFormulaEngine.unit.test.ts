import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import { useFormulaEngine } from './useFormulaEngine';

describe('useFormulaEngine', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Initial state ──────────────────────────────────────────────────────────

  describe('initial state', () => {
    it('shouldReturnEmptyFormula_whenNoInitialFormulaIsProvided', () => {
      const { result } = renderHook(() => useFormulaEngine({ fixedParams: {}, dynamicParams: {} }));

      expect(result.current.formula).toBe('');
    });

    it('shouldReturnInitialFormula_whenInitialFormulaIsProvided', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: { a: 1 },
          dynamicParams: { b: 2 },
          initialFormula: 'a + b',
        }),
      );

      expect(result.current.formula).toBe('a + b');
    });
  });

  // ── mergedScope ────────────────────────────────────────────────────────────

  describe('mergedScope', () => {
    it('shouldMergeFixedAndDynamic_withFixedWinningOnCollision', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: { a: 99 },
          dynamicParams: { a: 1, b: 2 },
        }),
      );

      expect(result.current.mergedScope).toEqual({ a: 99, b: 2 });
    });

    it('shouldIncludeAllEntries_whenThereIsNoCollision', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: { rate: 10 },
          dynamicParams: { hours: 8 },
        }),
      );

      expect(result.current.mergedScope).toEqual({ rate: 10, hours: 8 });
    });

    it('shouldUpdateMergedScope_whenDynamicParamsChange', () => {
      let dynamicParams = { x: 10 };
      const { result, rerender } = renderHook(() =>
        useFormulaEngine({ fixedParams: {}, dynamicParams }),
      );
      expect(result.current.mergedScope).toEqual({ x: 10 });

      dynamicParams = { x: 20 };
      rerender();

      expect(result.current.mergedScope).toEqual({ x: 20 });
    });

    it('shouldUpdateMergedScope_whenFixedParamsChange', () => {
      let fixedParams = { rate: 10 };
      const { result, rerender } = renderHook(() =>
        useFormulaEngine({ fixedParams, dynamicParams: {} }),
      );
      expect(result.current.mergedScope).toEqual({ rate: 10 });

      fixedParams = { rate: 20 };
      rerender();

      expect(result.current.mergedScope).toEqual({ rate: 20 });
    });
  });

  // ── setFormula ─────────────────────────────────────────────────────────────

  describe('setFormula', () => {
    it('shouldUpdateFormula_whenCalled', () => {
      const { result } = renderHook(() => useFormulaEngine({ fixedParams: {}, dynamicParams: {} }));

      act(() => {
        result.current.setFormula('x * 2');
      });

      expect(result.current.formula).toBe('x * 2');
    });

    it('shouldCallOnChange_withUpdatedFormula', () => {
      const onChange = vi.fn();
      const { result } = renderHook(() =>
        useFormulaEngine({ fixedParams: {}, dynamicParams: {}, onChange }),
      );

      act(() => {
        result.current.setFormula('x * 2');
      });

      expect(onChange).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledWith('x * 2');
    });

    it('shouldNotThrow_whenOnChangeIsNotProvided', () => {
      const { result } = renderHook(() => useFormulaEngine({ fixedParams: {}, dynamicParams: {} }));

      expect(() => {
        act(() => {
          result.current.setFormula('x * 2');
        });
      }).not.toThrow();
    });

    it('shouldReturnStableSetFormula_acrossRerendersWithUnchangedOnChange', () => {
      const onChange = vi.fn();
      const { result, rerender } = renderHook(() =>
        useFormulaEngine({ fixedParams: {}, dynamicParams: {}, onChange }),
      );
      const firstRef = result.current.setFormula;

      rerender();

      expect(result.current.setFormula).toBe(firstRef);
    });
  });

  // ── result ─────────────────────────────────────────────────────────────────

  describe('result', () => {
    it('shouldReturnEmptyFormulaError_whenFormulaIsEmpty', () => {
      const { result } = renderHook(() => useFormulaEngine({ fixedParams: {}, dynamicParams: {} }));

      expect(result.current.result.value).toBeNull();
      expect(result.current.result.raw).toBeNull();
      expect(result.current.result.error?.message).toBe('Formula is empty.');
    });

    it('shouldReturnParseError_whenFormulaIsSyntacticallyInvalid', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: {},
          dynamicParams: {},
          initialFormula: 'a +',
        }),
      );

      expect(result.current.result.error).not.toBeNull();
      expect(result.current.result.value).toBeNull();
      expect(result.current.result.raw).toBeNull();
    });

    it('shouldReturnMissingVariableError_whenVariablesAreAbsentFromScope', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: {},
          dynamicParams: {},
          initialFormula: 'rate * hours',
        }),
      );

      expect(result.current.result.error?.message).toContain('Missing');
      expect(result.current.result.value).toBeNull();
    });

    it('shouldEvaluateFormula_whenFormulaAndScopeAreValid', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: { rate: 10 },
          dynamicParams: { hours: 8 },
          initialFormula: 'rate * hours',
        }),
      );

      expect(result.current.result.error).toBeNull();
      expect(result.current.result.value).toBe('80');
      expect(result.current.result.raw).not.toBeNull();
    });

    it('shouldUpdateResult_whenScopeChangesWithoutFormulaChange', () => {
      let fixedParams = { rate: 10 };
      const { result, rerender } = renderHook(() =>
        useFormulaEngine({
          fixedParams,
          dynamicParams: { hours: 8 },
          initialFormula: 'rate * hours',
        }),
      );
      expect(result.current.result.value).toBe('80');

      fixedParams = { rate: 20 };
      rerender();

      expect(result.current.result.value).toBe('160');
    });

    it('shouldUpdateResult_whenFormulaChangesViaSetter', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: { a: 5, b: 3 },
          dynamicParams: {},
          initialFormula: 'a + b',
        }),
      );
      expect(result.current.result.value).toBe('8');

      act(() => {
        result.current.setFormula('a * b');
      });

      expect(result.current.result.value).toBe('15');
    });
  });

  // ── usedVariables ──────────────────────────────────────────────────────────

  describe('usedVariables', () => {
    it('shouldReturnEmptyArray_whenFormulaIsEmpty', () => {
      const { result } = renderHook(() => useFormulaEngine({ fixedParams: {}, dynamicParams: {} }));

      expect(result.current.usedVariables).toEqual([]);
    });

    it('shouldReturnEmptyArray_whenFormulaHasParseError', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: {},
          dynamicParams: {},
          initialFormula: '(((',
        }),
      );

      expect(result.current.usedVariables).toEqual([]);
    });

    it('shouldReturnUserVariablesOnly_excludingMathBuiltins', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: { rate: 10, hours: 8 },
          dynamicParams: {},
          initialFormula: 'rate * hours + sqrt(2)',
        }),
      );

      expect(result.current.usedVariables.sort()).toEqual(['hours', 'rate']);
    });

    it('shouldUpdateUsedVariables_whenFormulaChangesViaSetter', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: { a: 1, b: 2 },
          dynamicParams: {},
          initialFormula: 'a + b',
        }),
      );
      expect(result.current.usedVariables.sort()).toEqual(['a', 'b']);

      act(() => {
        result.current.setFormula('a * 2');
      });

      expect(result.current.usedVariables).toEqual(['a']);
    });

    it('shouldReturnEmptyArray_whenFormulaContainsOnlyBuiltins', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: {},
          dynamicParams: {},
          initialFormula: 'sqrt(4) + pi',
        }),
      );

      expect(result.current.usedVariables).toEqual([]);
    });
  });

  // ── precisionWarning ───────────────────────────────────────────────────────

  describe('precisionWarning', () => {
    it('shouldBeNull_whenResultHasNoRawValue', () => {
      // Empty formula → result.raw is null → drift check is skipped.
      const { result } = renderHook(() => useFormulaEngine({ fixedParams: {}, dynamicParams: {} }));

      expect(result.current.precisionWarning).toBeNull();
    });

    it('shouldBeNull_whenMissingVariablesPreventsEvaluation', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: {},
          dynamicParams: {},
          initialFormula: 'rate * hours',
        }),
      );

      expect(result.current.precisionWarning).toBeNull();
    });

    it('shouldBeNull_whenFormulaDoesNotDrift', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: { a: 2 },
          dynamicParams: {},
          initialFormula: 'a * 3',
        }),
      );

      expect(result.current.precisionWarning).toBeNull();
    });

    it('shouldReturnWarningString_whenIeee754DoubleDriftsFromBigNumber', () => {
      // pow(2, 53) + 1 - pow(2, 53):
      //   BigNumber (64-digit): 9007199254740993 - 9007199254740992 = 1
      //   IEEE 754 double:      2^53 + 1 rounds down to 2^53, so the result is 0
      // Relative drift = 1.0, which is >> the 1e-9 threshold → warning fires.
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: {},
          dynamicParams: {},
          initialFormula: 'pow(2, 53) + 1 - pow(2, 53)',
        }),
      );

      expect(result.current.precisionWarning).not.toBeNull();
      expect(result.current.precisionWarning).toContain('Precision warning');
      expect(result.current.precisionWarning).toContain('exp4j');
    });

    it('shouldUpdatePrecisionWarning_whenFormulaChangesToDriftingFormula', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({ fixedParams: {}, dynamicParams: {}, initialFormula: '' }),
      );
      expect(result.current.precisionWarning).toBeNull();

      act(() => {
        result.current.setFormula('pow(2, 53) + 1 - pow(2, 53)');
      });

      expect(result.current.precisionWarning).not.toBeNull();
    });

    it('shouldClearPrecisionWarning_whenFormulaChangesToNonDriftingFormula', () => {
      const { result } = renderHook(() =>
        useFormulaEngine({
          fixedParams: {},
          dynamicParams: {},
          initialFormula: 'pow(2, 53) + 1 - pow(2, 53)',
        }),
      );
      expect(result.current.precisionWarning).not.toBeNull();

      act(() => {
        result.current.setFormula('');
      });

      expect(result.current.precisionWarning).toBeNull();
    });
  });
});
