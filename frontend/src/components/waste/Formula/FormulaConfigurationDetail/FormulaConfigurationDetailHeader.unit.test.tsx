import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import FormulaConfigurationDetailHeader from './FormulaConfigurationDetailHeader.tsx';

describe('FormulaConfigurationDetailHeader', () => {
  it('renders area and an open-ended date range', () => {
    render(<FormulaConfigurationDetailHeader area="COASTAL" startDate="2026-06-01" endDate={null} />);

    expect(screen.getByTestId('card-item-content-area').textContent).toBe('Coastal');
    expect(screen.getByTestId('card-item-content-end-date').textContent).toBe('Open-ended');
  });

  it('renders a closed end date', () => {
    render(<FormulaConfigurationDetailHeader area="INTERIOR" startDate="2026-06-01" endDate="2026-12-31" />);

    expect(screen.getByTestId('card-item-content-end-date').textContent).toContain('December 31, 2026');
  });
});
