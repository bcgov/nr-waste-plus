import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import WasteAssessmentAreaSummaryCard from './index';

describe('WasteAssessmentAreaSummaryCard (S7)', () => {
  it('renders rows and total as received and navigates to area calculator', async () => {
    const user = userEvent.setup();
    const onGoToAreaCalculator = vi.fn();
    render(
      <WasteAssessmentAreaSummaryCard
        rows={[{ markType: 'Primary', timberMarkId: '74/1AD', netWasteAreaHa: 1.89 }]}
        totalNetWasteAreaHa={1.89}
        onGoToAreaCalculator={onGoToAreaCalculator}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Waste assessment area summary' })).toBeTruthy();
    expect(screen.getByText('Primary')).toBeTruthy();
    expect(screen.getByText('74/1AD')).toBeTruthy();
    expect(screen.getAllByText('1.89').length).toBeGreaterThanOrEqual(1);
    await user.click(screen.getByRole('button', { name: 'Go to area calculator' }));
    expect(onGoToAreaCalculator).toHaveBeenCalledOnce();
  });

  it('renders empty-safe with dashes and default total', () => {
    const { rerender } = render(<WasteAssessmentAreaSummaryCard />);
    expect(screen.getByText('0.0')).toBeTruthy();

    rerender(<WasteAssessmentAreaSummaryCard rows={[{}]} />);
    expect(screen.getAllByText('--').length).toBeGreaterThan(0);
  });
});
