import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useFormulaConfiguration', () => ({
  useFormulaVariables: vi.fn(() => ({ data: undefined })),
}));

import FormulaConfigurationDetailView from './FormulaConfigurationDetailView';

import type { FormulaSetResponse } from '@/services/formulaConfiguration.types';

const fixture: FormulaSetResponse = {
  id: 42,
  area: 'INTERIOR',
  startDate: '2026-06-01',
  endDate: null,
  deleted: false,
  formulas: [
    {
      formulaKey: 'block.waste.avoidable_sawlog',
      expression: '1.5',
      declaredVariables: [],
      validationErrors: [
        { code: 'UNKNOWN_VARIABLE', message: 'Variable is not defined', startOffset: 2 },
      ],
      sortOrder: 1,
    },
    {
      formulaKey: 'da.mature.avoidableGradeY',
      expression: '2.5',
      declaredVariables: [],
      validationErrors: [],
      sortOrder: 2,
    },
  ],
};

describe('FormulaConfigurationDetailView', () => {
  it('renders configured formulas returned by the API', () => {
    const { container } = render(<FormulaConfigurationDetailView data={fixture} />);
    expect(screen.getByText('Avoidable Sawlog Volume')).toBeTruthy();
    expect(screen.getByText('1.5')).toBeTruthy();
    expect(screen.getByText('Additional Formulas')).toBeTruthy();
    expect(screen.getByText('da.mature.avoidableGradeY')).toBeTruthy();
    expect(screen.getByText('UNKNOWN_VARIABLE')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Variable is not defined');
    expect(container.querySelector('pre')).toBeNull();
  });

  it('renders the formula set metadata', () => {
    render(<FormulaConfigurationDetailView data={fixture} />);
    expect(screen.getByText('Open-ended')).toBeTruthy();
  });

  it('does not crash when API response omits declaredVariables and validationErrors', () => {
    const minimalFixture: FormulaSetResponse = {
      ...fixture,
      formulas: [
        {
          formulaKey: 'block.waste.avoidable_sawlog',
          expression: '1.5',
          sortOrder: 1,
        },
        {
          formulaKey: 'da.mature.avoidableGradeY',
          expression: '2.5',
          sortOrder: 2,
        },
      ],
    };
    render(<FormulaConfigurationDetailView data={minimalFixture} />);
    expect(screen.getByText('Avoidable Sawlog Volume')).toBeTruthy();
    expect(screen.getByText('1.5')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
