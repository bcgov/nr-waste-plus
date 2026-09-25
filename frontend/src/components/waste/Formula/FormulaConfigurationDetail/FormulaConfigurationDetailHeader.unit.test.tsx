/* eslint-disable testing-library/no-container, testing-library/no-node-access --
   The class-rename assertions below have no semantic-query equivalent. */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import FormulaConfigurationDetailHeader from './FormulaConfigurationDetailHeader.tsx';

describe('FormulaConfigurationDetailHeader', () => {
  it('renders start date and an open-ended date range', () => {
    render(<FormulaConfigurationDetailHeader startDate="2026-06-01" endDate={null} />);

    expect(screen.getByTestId('card-item-content-start-date')).toBeTruthy();
    expect(screen.getByTestId('card-item-content-end-date').textContent).toBe('Open-ended');
  });

  it('renders a closed end date', () => {
    render(<FormulaConfigurationDetailHeader startDate="2026-06-01" endDate="2026-12-31" />);

    expect(screen.getByTestId('card-item-content-end-date').textContent).toContain(
      'December 31, 2026',
    );
  });

  it('renders formula-set-detail column classes', () => {
    const { container } = render(
      <FormulaConfigurationDetailHeader startDate="2026-06-01" endDate={null} />,
    );

    expect(container.querySelector('.formula-set-detail__start-date')).toBeTruthy();
    expect(container.querySelector('.formula-set-detail__end-date')).toBeTruthy();
    expect(container.querySelector('.district-volume-detail__start-date')).toBeNull();
    expect(container.querySelector('.district-volume-detail__end-date')).toBeNull();
  });
});
