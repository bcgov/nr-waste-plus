import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import WasteAssessmentAreaSummaryCard from './index';

describe('WasteAssessmentAreaSummaryCard', () => {
  it('renders header, helper, and table columns', () => {
    render(<WasteAssessmentAreaSummaryCard />);

    expect(screen.getByRole('heading', { name: 'Waste assessment area summary' })).toBeTruthy();
    expect(
      screen.getByText('Use area calculator to add waste assessment area details'),
    ).toBeTruthy();
    expect(screen.getByText('Timber mark type')).toBeTruthy();
    expect(screen.getByText('Timber mark ID')).toBeTruthy();
    expect(screen.getByText('Net waste area (ha)')).toBeTruthy();
  });

  it('renders hardcoded primary mark row and default total when undefined', () => {
    render(<WasteAssessmentAreaSummaryCard />);

    expect(screen.getByText('Primary mark')).toBeTruthy();
    expect(screen.getByText('74/1AD')).toBeTruthy();
    const totalLabel = screen.getByText('Total net waste area (ha)');
    const totalRow = totalLabel.closest('[role="row"]');
    expect(totalRow).not.toBeNull();
    expect(within(totalRow as HTMLElement).getByText('0.0')).toBeTruthy();
  });

  it('renders supplied rows and explicit null total as empty-safe', () => {
    render(
      <WasteAssessmentAreaSummaryCard
        rows={[{ markType: 'Secondary mark', timberMarkId: null, netWasteAreaHa: '   ' }]}
        totalNetWasteAreaHa={null}
      />,
    );

    expect(screen.getByText('Secondary mark')).toBeTruthy();
    const totalLabel = screen.getByText('Total net waste area (ha)');
    const totalRow = totalLabel.closest('[role="row"]');
    expect(totalRow).not.toBeNull();
    expect(within(totalRow as HTMLElement).getByText('-')).toBeTruthy();
    expect(within(totalRow as HTMLElement).queryByText('0.0')).toBeNull();
  });

  it('calls onGoToAreaCalculator when button is clicked', async () => {
    const user = userEvent.setup();
    const onGoToAreaCalculator = vi.fn();
    render(<WasteAssessmentAreaSummaryCard onGoToAreaCalculator={onGoToAreaCalculator} />);

    await user.click(screen.getByRole('button', { name: 'Go to area calculator' }));
    expect(onGoToAreaCalculator).toHaveBeenCalledTimes(1);
  });
});
