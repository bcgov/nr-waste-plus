/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import WasteSearchFiltersActive from './index';

const defaultFilters = {
  mainSearchTerm: '',
  sampling: [],
  district: [],
  status: [],
};

const renderWithProps = (props: any) => {
  return render(
    <WasteSearchFiltersActive
      filters={defaultFilters}
      onRemoveFilter={props.onRemoveFilter || vi.fn()}
      {...props}
    />,
  );
};

describe('WasteSearchFiltersActive', () => {
  it('renders search filters active with no filters', async () => {
    const { container } = renderWithProps({});
    expect(container).toBeDefined(); //This is defined in
  });

  it('renders search filters active with some filters', async () => {
    const filters = {
      district: ['A'],
      requestByMe: true,
      timberMark: 'mark',
    };
    renderWithProps({ filters });
    expect(screen.getByTestId('dt-district-A')).toBeDefined();
    expect(screen.getByTestId('dt-timberMark-mark')).toBeDefined();
    expect(screen.getByTestId('dt-requestByMe-true')).toBeDefined();
  });

  it('renders search filters active with no filters when passing invisible or invalid values', async () => {
    const filters = {
      mainSearchTerm: 'not to be seen',
      district: [],
      timberMark: null,
      clientNumber: undefined,
      clientLocationCode: '',
    };
    const { container } = renderWithProps({ filters });
    expect(container).toBeDefined(); //This is defined in
  });

  it('renders search filters and remove the filter', async () => {
    const filters = {
      district: ['A'],
    };
    const onRemoveFilter = vi.fn();
    renderWithProps({ filters, onRemoveFilter });

    expect(screen.getByTestId('dt-district-A')).toBeDefined();
    const removeButton = screen.getByRole('button', { name: 'Dismiss' });
    expect(removeButton).toBeDefined();
    await userEvent.click(removeButton);
    expect(onRemoveFilter).toHaveBeenCalled();
  });
});
