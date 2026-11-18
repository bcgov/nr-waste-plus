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

  it('renders no hardcoded placeholder mark when summary data is absent', () => {
    render(<WasteAssessmentAreaSummaryCard />);

    expect(screen.queryByText('Primary mark')).toBeNull();
    expect(screen.queryByText('Secondary mark')).toBeNull();
    expect(screen.queryByText('74/1AD')).toBeNull();
    const totalRow = screen
      .getAllByRole('row')
      .find((row) => within(row).queryByText('Total net waste area (ha)'));
    expect(totalRow).toBeTruthy();
    expect(within(totalRow as HTMLElement).getByText('-')).toBeTruthy();
  });

  it('renders primary and secondary rows with missing values as - and backend total', () => {
    render(
      <WasteAssessmentAreaSummaryCard
        primary={{ timberMarkId: 'TM-PRIMARY', netWasteAreaHa: null }}
        secondary={[
          { timberMarkId: 'TM-SEC-1', netWasteAreaHa: 1.23 },
          { timberMarkId: null, netWasteAreaHa: undefined },
        ]}
        totalNetWasteAreaHa={1.23}
      />,
    );

    expect(screen.getByText('Primary mark')).toBeTruthy();
    expect(screen.getByText('TM-PRIMARY')).toBeTruthy();
    expect(screen.getAllByText('Secondary mark')).toHaveLength(2);
    expect(screen.getByText('TM-SEC-1')).toBeTruthy();

    const rows = screen.getAllByRole('row');
    const primaryRow = rows.find((row) => within(row).queryByText('TM-PRIMARY'));
    expect(primaryRow).toBeTruthy();
    expect(within(primaryRow as HTMLElement).getByText('-')).toBeTruthy();

    const secondaryRowWithArea = rows.find((row) => within(row).queryByText('TM-SEC-1'));
    expect(secondaryRowWithArea).toBeTruthy();
    expect(within(secondaryRowWithArea as HTMLElement).getByText('1.23')).toBeTruthy();

    const secondSecondaryRow = rows.find(
      (row) =>
        within(row).queryAllByText('Secondary mark').length === 1 &&
        !within(row).queryByText('TM-SEC-1'),
    );
    expect(secondSecondaryRow).toBeTruthy();
    expect(within(secondSecondaryRow as HTMLElement).getAllByText('-').length).toBeGreaterThan(0);

    const totalRow = rows.find((row) => within(row).queryByText('Total net waste area (ha)'));
    expect(totalRow).toBeTruthy();
    expect(within(totalRow as HTMLElement).getByText('1.23')).toBeTruthy();
  });

  it('renders backend-precomputed zero total when provided', () => {
    render(
      <WasteAssessmentAreaSummaryCard
        primary={{ timberMarkId: 'TM-TEST', netWasteAreaHa: null }}
        secondary={[]}
        totalNetWasteAreaHa={0}
      />,
    );

    const totalRow = screen
      .getAllByRole('row')
      .find((row) => within(row).queryByText('Total net waste area (ha)'));
    expect(totalRow).toBeTruthy();
    expect(within(totalRow as HTMLElement).getByText('0')).toBeTruthy();
  });

  it('calls onGoToAreaCalculator when button is clicked', async () => {
    const user = userEvent.setup();
    const onGoToAreaCalculator = vi.fn();
    render(<WasteAssessmentAreaSummaryCard onGoToAreaCalculator={onGoToAreaCalculator} />);

    await user.click(screen.getByRole('button', { name: 'Go to area calculator' }));
    expect(onGoToAreaCalculator).toHaveBeenCalledTimes(1);
  });
});
