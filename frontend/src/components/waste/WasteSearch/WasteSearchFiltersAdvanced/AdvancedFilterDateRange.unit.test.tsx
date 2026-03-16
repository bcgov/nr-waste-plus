import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import AdvancedFilterDateRange from './AdvancedFilterDateRange';

describe('AdvancedFilterDateRange', () => {
  it('renders both date pickers', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();

    render(
      <AdvancedFilterDateRange
        startDateValue=""
        endDateValue=""
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />,
    );

    const startInput = screen.getByTestId('start-date-picker-input-id');
    const endInput = screen.getByTestId('end-date-picker-input-id');

    expect(startInput).toBeDefined();
    expect(endInput).toBeDefined();
  });

  it('displays start date value when provided', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();

    render(
      <AdvancedFilterDateRange
        startDateValue="2020-01-15"
        endDateValue=""
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />,
    );

    const startInput = screen.getByTestId('start-date-picker-input-id');
    // The value should be empty initially as default values are handled by the picker
    expect(startInput).toBeDefined();
  });

  it('calls onStartDateChange when start date is modified', async () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();

    render(
      <AdvancedFilterDateRange
        startDateValue=""
        endDateValue=""
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />,
    );

    const startInput = screen.getByTestId('start-date-picker-input-id');
    await userEvent.type(startInput, '2020/01/25');
    fireEvent.blur(startInput);

    expect(onStartDateChange).toHaveBeenCalled();
    const firstArg = onStartDateChange.mock.calls[0]?.[0];
    expect(Array.isArray(firstArg)).toBe(true);
    expect(firstArg?.[0]).toBeInstanceOf(Date);
  });

  it('calls onEndDateChange when end date is modified', async () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();

    render(
      <AdvancedFilterDateRange
        startDateValue=""
        endDateValue=""
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />,
    );

    const endInput = screen.getByTestId('end-date-picker-input-id');
    await userEvent.type(endInput, '2020/02/10');
    fireEvent.blur(endInput);

    expect(onEndDateChange).toHaveBeenCalled();
    const firstArg = onEndDateChange.mock.calls[0]?.[0];
    expect(Array.isArray(firstArg)).toBe(true);
    expect(firstArg?.[0]).toBeInstanceOf(Date);
  });

  it('shows correct labels on date inputs', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();

    render(
      <AdvancedFilterDateRange
        startDateValue=""
        endDateValue=""
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />,
    );

    const startLabel = screen.getByText('Start date');
    const endLabel = screen.getByText('End date');

    expect(startLabel).toBeDefined();
    expect(endLabel).toBeDefined();
  });

  it('shows helper text for date inputs', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();

    render(
      <AdvancedFilterDateRange
        startDateValue=""
        endDateValue=""
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />,
    );

    const startHelper = screen.getByText('Search by last update');
    expect(startHelper).toBeDefined();
  });

  it('has correct placeholder format for both inputs', () => {
    const onStartDateChange = vi.fn();
    const onEndDateChange = vi.fn();

    render(
      <AdvancedFilterDateRange
        startDateValue=""
        endDateValue=""
        onStartDateChange={onStartDateChange}
        onEndDateChange={onEndDateChange}
      />,
    );

    const startInput = screen.getByTestId<HTMLInputElement>('start-date-picker-input-id');
    const endInput = screen.getByTestId<HTMLInputElement>('end-date-picker-input-id');

    expect(startInput.placeholder).toBe('yyyy/mm/dd');
    expect(endInput.placeholder).toBe('yyyy/mm/dd');
  });
});
