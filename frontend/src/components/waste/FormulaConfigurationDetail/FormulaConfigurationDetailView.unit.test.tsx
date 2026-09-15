import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

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
      validationErrors: [],
      sortOrder: 1,
    },
  ],
  createdAt: '2026-05-15T14:23:00Z',
  updatedAt: '2026-06-01T10:00:00Z',
};

const expected = JSON.stringify(fixture, null, 2);

describe('FormulaConfigurationDetailView', () => {
  it('renders the serialized JSON representation of the data', () => {
    const { container } = render(<FormulaConfigurationDetailView data={fixture} />);
    const pre = container.querySelector('pre');
    expect(pre).toBeTruthy();
    expect(pre?.textContent).toBe(expected);
  });

  it('renders the id inside the JSON payload', () => {
    const { container } = render(<FormulaConfigurationDetailView data={fixture} />);
    expect(container.querySelector('pre')?.textContent).toContain('"id": 42');
  });
});
