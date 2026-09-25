import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useFormulaConfiguration', () => ({
  useFormulaVariables: vi.fn(() => ({ data: undefined })),
}));

import FormulaConfigurationDetail from '.';

import type { FormulaSetResponse } from '@/services/formulaConfiguration.types.ts';

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
      validationErrors: [{ code: 'UNKNOWN_VARIABLE', message: 'Variable is not defined', startOffset: 2 }],
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
  createdAt: '2026-05-15T14:23:00Z',
  updatedAt: '2026-06-01T10:00:00Z',
};

describe('FormulaConfigurationDetailView', () => {
  it('renders configured formulas returned by the API', () => {
    const { container } = render(<FormulaConfigurationDetail data={fixture} />);
    expect(screen.getByText('Avoidable Sawlog Volume')).toBeTruthy();
    expect(screen.getByText('1.5')).toBeTruthy();
    expect(screen.getByText('Additional Formulas')).toBeTruthy();
    expect(screen.getByText('da.mature.avoidableGradeY')).toBeTruthy();
    expect(screen.getByText('UNKNOWN_VARIABLE')).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toContain('Variable is not defined');
    expect(container.querySelector('pre')).toBeNull();
  });

  it('renders the formula set metadata', () => {
    render(<FormulaConfigurationDetail data={fixture} />);
    expect(screen.getByText('Open-ended')).toBeTruthy();
  });

  it('omits the Additional Formulas section when every formula is configured', () => {
    const configuredOnly: FormulaSetResponse = {
      ...fixture,
      formulas: [
        {
          formulaKey: 'block.waste.avoidable_sawlog',
          expression: '1.5',
          declaredVariables: [],
          validationErrors: [],
          sortOrder: 1,
        },
      ],
    };
    render(<FormulaConfigurationDetail data={configuredOnly} />);
    expect(screen.queryByText('Additional Formulas')).toBeNull();
    expect(screen.getByText('Avoidable Sawlog Volume')).toBeTruthy();
    expect(screen.getByText('1.5')).toBeTruthy();
  });
});
