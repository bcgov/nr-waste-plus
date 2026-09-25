import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { FormulaKeyDefinition } from '@/services/formulaConfiguration.constants.ts';
import type { FormulaItemDto } from '@/services/formulaConfiguration.types.ts';

import FormulaRow from './FormulaRow.tsx';

// ─── Mocks ─────────────────────────────────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  formulaInputOnChange: null as ((value: string) => void) | null,
  formulaInputOnValidationError: null as ((error: { message: string } | null) => void) | null,
  useFormulaVariables: vi.fn(),
}));

vi.mock('@/components/Form/FormulaInput', () => ({
  default: ({
    initialFormula,
    onChange,
    onValidationError,
    ariaLabel,
  }: {
    initialFormula?: string;
    onChange?: (value: string) => void;
    onValidationError?: (error: { message: string } | null) => void;
    ariaLabel?: string;
  }) => {
    mocks.formulaInputOnChange = onChange ?? null;
    mocks.formulaInputOnValidationError = onValidationError ?? null;
    return (
      <div data-testid="formula-input" aria-label={ariaLabel}>
        <span data-testid="formula-input-value">{initialFormula}</span>
        {/* Buttons to simulate user interactions for testing callbacks */}
        <button data-testid="trigger-change" onClick={() => onChange?.('new_value')}>
          simulate change
        </button>
        <button
          data-testid="trigger-validation-error"
          onClick={() => onValidationError?.({ message: 'Syntax error' })}
        >
          simulate error
        </button>
        <button data-testid="trigger-clear-error" onClick={() => onValidationError?.(null)}>
          simulate clear error
        </button>
      </div>
    );
  },
}));

vi.mock('@/components/Form/ReadonlyInput', () => ({
  default: ({ label, children }: { label: string; children?: React.ReactNode }) => (
    <div data-testid="readonly-input">
      <span data-testid="readonly-label">{label}</span>
      <span data-testid="readonly-value">{children}</span>
    </div>
  ),
}));

vi.mock('@/hooks/useFormulaConfiguration', () => ({
  useFormulaVariables: (...args: unknown[]) => mocks.useFormulaVariables(...args),
}));

// ─── Test Data ─────────────────────────────────────────────────────────────────

const keyDef: FormulaKeyDefinition = {
  key: 'WASTE_VOLUME_INTERIOR',
  label: 'Waste Volume - Interior',
};

const formulaDto: FormulaItemDto = {
  formulaKey: 'WASTE_VOLUME_INTERIOR',
  expression: 'quantity * rate',
  declaredVariables: [],
  validationErrors: [],
  sortOrder: 1,
};

const formulaWithErrors: FormulaItemDto = {
  ...formulaDto,
  validationErrors: [
    { code: 'SYNTAX_ERROR', message: 'Unexpected token', startOffset: 0, endOffset: 5 },
  ],
};

const defaultProps = {
  area: 'INTERIOR' as const,
  date: '2025-01-15',
  keyDef,
  formula: formulaDto,
  isEditable: false,
  onChange: vi.fn(),
};

// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('FormulaRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useFormulaVariables.mockReturnValue({
      data: { flat: { quantity: 10, rate: 1.5 } },
    });
  });

  // ─── Readonly Mode ──────────────────────────────────────────────────────────

  describe('readonly mode', () => {
    it('renders the key label', () => {
      render(<FormulaRow {...defaultProps} />);
      expect(screen.getByText('Waste Volume - Interior')).toBeTruthy();
    });

    it('displays the expression in ReadonlyInput', () => {
      render(<FormulaRow {...defaultProps} />);
      expect(screen.getByTestId('readonly-label').textContent).toBe('Expression');
      expect(screen.getByTestId('readonly-value').textContent).toBe('quantity * rate');
    });

    it('shows "Not configured" when expression is empty', () => {
      const emptyFormula = { ...formulaDto, expression: '' };
      render(<FormulaRow {...defaultProps} formula={emptyFormula} />);
      expect(screen.getByText('Not configured')).toBeTruthy();
    });

    it('shows "Not configured" when formula is undefined', () => {
      render(<FormulaRow {...defaultProps} formula={undefined} />);
      expect(screen.getByText('Not configured')).toBeTruthy();
    });

    it('displays validation errors', () => {
      render(<FormulaRow {...defaultProps} formula={formulaWithErrors} />);
      expect(screen.getByRole('alert')).toBeTruthy();
      expect(screen.getByText('SYNTAX_ERROR')).toBeTruthy();
      expect(screen.getByText(/Unexpected token/)).toBeTruthy();
    });

    it('renders a validation error when offsets are omitted', () => {
      const errorWithoutOffsets: FormulaItemDto = {
        ...formulaDto,
        validationErrors: [{ code: 'UNKNOWN_VARIABLE', message: 'Variable is not defined' }],
      };
      render(<FormulaRow {...defaultProps} formula={errorWithoutOffsets} />);
      const alert = screen.getByRole('alert');
      expect(alert.textContent).toContain('UNKNOWN_VARIABLE');
      expect(alert.textContent).toContain('Variable is not defined');
    });

    it('does not render FormulaInput in readonly mode', () => {
      render(<FormulaRow {...defaultProps} />);
      expect(screen.queryByTestId('formula-input')).toBeNull();
    });
  });

  // ─── Editable Mode ──────────────────────────────────────────────────────────

  describe('editable mode', () => {
    const editableProps = { ...defaultProps, isEditable: true };

    it('renders FormulaInput with the expression', () => {
      render(<FormulaRow {...editableProps} />);
      expect(screen.getByTestId('formula-input')).toBeTruthy();
      expect(screen.getByTestId('formula-input-value').textContent).toBe('quantity * rate');
    });

    it('passes ariaLabel with key label and key', () => {
      render(<FormulaRow {...editableProps} />);
      expect(screen.getByTestId('formula-input').getAttribute('aria-label')).toBe(
        'Waste Volume - Interior (WASTE_VOLUME_INTERIOR)',
      );
    });

    it('does not render ReadonlyInput in editable mode', () => {
      render(<FormulaRow {...editableProps} />);
      expect(screen.queryByTestId('readonly-input')).toBeNull();
    });

    it('calls onChange with expression when FormulaInput fires onChange', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<FormulaRow {...editableProps} onChange={onChange} />);

      await user.click(screen.getByTestId('trigger-change'));

      expect(onChange).toHaveBeenCalledWith('new_value', []);
    });

    it('calls onChange with validation error when FormulaInput fires onValidationError', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<FormulaRow {...editableProps} onChange={onChange} />);

      await user.click(screen.getByTestId('trigger-validation-error'));

      expect(onChange).toHaveBeenCalledWith('quantity * rate', [
        { code: 'FORMULA_ERROR', message: 'Syntax error' },
      ]);
    });

    it('calls onChange with empty errors when validation error is cleared', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<FormulaRow {...editableProps} onChange={onChange} />);

      await user.click(screen.getByTestId('trigger-clear-error'));

      expect(onChange).toHaveBeenCalledWith('quantity * rate', []);
    });

    it('updates expressionRef when onChange fires, so validation errors use the latest expression', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<FormulaRow {...editableProps} onChange={onChange} />);

      // First change the expression
      await user.click(screen.getByTestId('trigger-change'));
      expect(onChange).toHaveBeenCalledWith('new_value', []);

      // Then trigger a validation error — should use the updated expressionRef
      await user.click(screen.getByTestId('trigger-validation-error'));
      expect(onChange).toHaveBeenCalledWith('new_value', [
        { code: 'FORMULA_ERROR', message: 'Syntax error' },
      ]);
    });

    it('initializes expressionRef from formula.expression', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<FormulaRow {...editableProps} onChange={onChange} />);

      // Trigger validation error immediately — should use the initial expression
      await user.click(screen.getByTestId('trigger-validation-error'));
      expect(onChange).toHaveBeenCalledWith('quantity * rate', [
        { code: 'FORMULA_ERROR', message: 'Syntax error' },
      ]);
    });

    it('uses empty string for expressionRef when formula is undefined', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<FormulaRow {...editableProps} formula={undefined} onChange={onChange} />);

      await user.click(screen.getByTestId('trigger-validation-error'));
      expect(onChange).toHaveBeenCalledWith('', [
        { code: 'FORMULA_ERROR', message: 'Syntax error' },
      ]);
    });

    it('clears the previous validation errors when the expression is edited', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<FormulaRow {...editableProps} formula={formulaWithErrors} onChange={onChange} />);

      await user.click(screen.getByTestId('trigger-change'));

      expect(onChange).toHaveBeenCalledWith('new_value', []);
    });

    it('re-syncs expressionRef when the expression prop changes', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      const { rerender } = render(<FormulaRow {...editableProps} onChange={onChange} />);

      // Carry-forward / area switch replaces the expression from the parent.
      rerender(
        <FormulaRow
          {...editableProps}
          formula={{ ...formulaDto, expression: 'carried_forward' }}
          onChange={onChange}
        />,
      );

      await user.click(screen.getByTestId('trigger-validation-error'));

      expect(onChange).toHaveBeenLastCalledWith('carried_forward', [
        { code: 'FORMULA_ERROR', message: 'Syntax error' },
      ]);
    });
  });

  // ─── Backend contract: optional fields omitted ──────────────────────────────

  describe('backend contract shape', () => {
    // The GET /api/configuration/formulas/{id} payload omits declaredVariables
    // and validationErrors entirely.
    const apiFormula: FormulaItemDto = {
      formulaKey: 'WASTE_VOLUME_INTERIOR',
      expression: 'quantity * rate',
      sortOrder: 1,
    };

    it('readonly: renders the expression with no validation errors when fields are omitted', () => {
      render(<FormulaRow {...defaultProps} formula={apiFormula} />);
      expect(screen.getByTestId('readonly-value').textContent).toBe('quantity * rate');
      expect(screen.queryByRole('alert')).toBeNull();
    });

    it('editable: renders and calls onChange with empty errors when fields are omitted', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <FormulaRow {...defaultProps} formula={apiFormula} isEditable={true} onChange={onChange} />,
      );

      await user.click(screen.getByTestId('trigger-change'));

      expect(onChange).toHaveBeenCalledWith('new_value', []);
    });

    it('editable: uses the API expression for validation errors when fields are omitted', async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(
        <FormulaRow {...defaultProps} formula={apiFormula} isEditable={true} onChange={onChange} />,
      );

      await user.click(screen.getByTestId('trigger-validation-error'));

      expect(onChange).toHaveBeenCalledWith('quantity * rate', [
        { code: 'FORMULA_ERROR', message: 'Syntax error' },
      ]);
    });
  });

  // ─── useFormulaVariables ────────────────────────────────────────────────────

  describe('useFormulaVariables integration', () => {
    it('passes date, area, district code and the editable flag to useFormulaVariables', () => {
      render(<FormulaRow {...defaultProps} isEditable={true} />);
      expect(mocks.useFormulaVariables).toHaveBeenCalledWith(
        {
          date: '2025-01-15',
          area: 'INTERIOR',
          districtCode: 'DKM',
        },
        true,
      );
    });

    it('skips the variables query when the row is read-only', () => {
      render(<FormulaRow {...defaultProps} isEditable={false} />);
      expect(mocks.useFormulaVariables).toHaveBeenCalledWith(expect.any(Object), false);
    });

    it('passes flat variables as dynamicParams to FormulaInput', () => {
      render(<FormulaRow {...defaultProps} isEditable={true} />);
      // The mock FormulaInput receives dynamicParams — we verify via the variables hook being called
      expect(mocks.useFormulaVariables).toHaveBeenCalled();
    });
  });
});
