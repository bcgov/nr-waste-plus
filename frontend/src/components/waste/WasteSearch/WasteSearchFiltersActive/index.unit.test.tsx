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

  it('shows a persistent source tag for legacy and PostgreSQL result sets', () => {
    renderWithProps({ filters: { ...defaultFilters, legacy: true } });
    expect(screen.getByTestId('search-source-tag').textContent).toBe('Source: Legacy');

    renderWithProps({ filters: { ...defaultFilters, legacy: false } });
    const sourceTags = screen.getAllByTestId('search-source-tag');
    expect(sourceTags.at(-1)?.textContent).toBe('Source: PostgreSQL');
  });

  it('renders search filters active with some filters', async () => {
    const filters = {
      district: ['A'],
      requestByMe: true,
      timberMark: 'mark',
    };
    renderWithProps({ filters });
    screen.getByTestId('dt-district-A');
    screen.getByTestId('dt-timberMark-mark');
    screen.getByTestId('dt-requestByMe-true');
  });

  it('renders search filters active with no filters when passing invisible or invalid values', async () => {
    const filters = {
      mainSearchTerm: 'not to be seen',
      district: [],
      timberMark: false,
      clientNumber: undefined,
      clientLocationCode: '',
    };
    renderWithProps({ filters });

    expect(screen.queryByTestId('dt-mainSearchTerm', { exact: false })).toBeNull();
    expect(screen.queryByTestId('dt-district', { exact: false })).toBeNull();
    expect(screen.queryByTestId('dt-timberMark', { exact: false })).toBeNull();
    expect(screen.queryByTestId('dt-clientNumber', { exact: false })).toBeNull();
    expect(screen.queryByTestId('dt-clientLocationCode', { exact: false })).toBeNull();
  });

  it('renders search filters and remove the filter', async () => {
    const filters = {
      district: ['A'],
    };
    const onRemoveFilter = vi.fn();
    renderWithProps({ filters, onRemoveFilter });

    screen.getByTestId('dt-district-A');
    const removeButton = screen.getByRole('button', { name: 'Dismiss' });
    await userEvent.click(removeButton);
    expect(onRemoveFilter).toHaveBeenCalled();
  });

  it('renders boolean filter tag and removes it', async () => {
    const filters = {
      requestByMe: true,
    };
    const onRemoveFilter = vi.fn();
    renderWithProps({ filters, onRemoveFilter });

    screen.getByTestId('dt-requestByMe-true');
    const removeButton = screen.getByRole('button', { name: 'Dismiss' });
    await userEvent.click(removeButton);
    expect(onRemoveFilter).toHaveBeenCalledWith('requestByMe');
  });

  it('renders non-boolean scalar filter tag and removes it', async () => {
    const filters = {
      timberMark: 'mark',
    };
    const onRemoveFilter = vi.fn();
    renderWithProps({ filters, onRemoveFilter });

    screen.getByTestId('dt-timberMark-mark');
    const removeButtons = screen.getAllByRole('button', { name: 'Dismiss' });
    await userEvent.click(removeButtons[0]);
    expect(onRemoveFilter).toHaveBeenCalledWith('timberMark');
  });

  it('clears all filters including array filters', async () => {
    const filters = {
      district: ['A', 'B'],
      timberMark: 'mark',
    };
    const onRemoveFilter = vi.fn();
    renderWithProps({ filters, onRemoveFilter });

    const clearButton = screen.getByRole('button', { name: /Clear filters/i });
    await userEvent.click(clearButton);

    // clearFilters should remove array values (district A, B) and then the scalar.
    expect(onRemoveFilter).toHaveBeenCalled();
    expect(onRemoveFilter).toHaveBeenCalledWith('district', 'A');
    expect(onRemoveFilter).toHaveBeenCalledWith('district', 'B');
    expect(onRemoveFilter).toHaveBeenCalledWith('timberMark');
  });

  it('renders multiple array subvalues and allows removing one', async () => {
    const filters = {
      district: ['A', 'B'],
    };
    const onRemoveFilter = vi.fn();
    renderWithProps({ filters, onRemoveFilter });

    screen.getByTestId('dt-district-A');
    screen.getByTestId('dt-district-B');
    const removeButtons = screen.getAllByRole('button', { name: 'Dismiss' });
    await userEvent.click(removeButtons[0]);
    expect(onRemoveFilter).toHaveBeenCalledWith('district', 'A');
  });
});
