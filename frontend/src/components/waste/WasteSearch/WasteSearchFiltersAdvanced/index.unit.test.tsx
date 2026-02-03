/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import WasteSearchFiltersAdvanced from './index';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';

vi.mock('@/services/APIs', () => {
  return {
    default: {
      forestclient: {
        getForestClientLocations: vi.fn(),
      },
    },
  };
});

const defaultFilters = {
  mainSearchTerm: '',
  sampling: [],
  district: [],
  status: [],
};

const renderWithProps = async (props: any) => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <AuthProvider>
          <PreferenceProvider>
            <WasteSearchFiltersAdvanced
              filters={defaultFilters}
              isModalOpen={props.isModalOpen || true}
              samplingOptions={props.samplingOptions || []}
              districtOptions={props.districtOptions || []}
              statusOptions={props.statusOptions || []}
              onClose={props.onClose || vi.fn()}
              onChange={props.onChange || vi.fn()}
              onSearch={props.onSearch || vi.fn()}
              {...props}
            />
          </PreferenceProvider>
        </AuthProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('WasteSearchFiltersActive', () => {
  it('renders advanced filter as modal', async () => {
    await renderWithProps({});
    const modal = await screen.findByRole('dialog');
    expect(modal).toBeDefined();
    expect(screen.getAllByText('Advanced search').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Search').length).toBeGreaterThan(0);
  });

  it('renders advanced filter with pre-filled values', async () => {
    const filters = {
      mainSearchTerm: 'filter filled',
      requestByMe: true,
    };

    await renderWithProps({ filters });

    const searchBox = screen.getByTestId('ru-or-block-text-input');
    expect(searchBox).toBeDefined();
    expect((searchBox as HTMLInputElement).value).toBe('filter filled');

    const byMeCheck = screen.getByTestId('created-by-me-checkbox');
    expect(byMeCheck).toBeDefined();
    expect((byMeCheck as HTMLInputElement).checked).toBe(true);
  });

  it('checkbox ticks', async () => {
    const onChange = vi.fn();
    const innerFn = vi.fn();
    onChange.mockReturnValue(innerFn);

    const filters = {
      requestByMe: true,
    };

    await renderWithProps({ filters, onChange });
    const byMeCheck = screen.getByTestId('created-by-me-checkbox');
    expect(byMeCheck).toBeDefined();
    expect((byMeCheck as HTMLInputElement).checked).toBe(true);

    await userEvent.click(byMeCheck);

    expect(onChange).toHaveBeenCalledWith('requestByMe');
    expect(innerFn).toHaveBeenCalledWith(false);
  });

  it('select a filterable', async () => {
    const onChange = vi.fn();
    const innerFn = vi.fn();
    onChange.mockReturnValue(innerFn);
    const samplingOptions = [
      { code: 'A', description: 'Sampling option: A' },
      { code: 'B', description: 'Sampling option: B' },
    ];

    await renderWithProps({ samplingOptions, onChange });

    const samplingBox = screen.getByRole('combobox', { name: /Sampling/i });
    const samplingButton = samplingBox.parentElement?.querySelector('button');

    expect(samplingBox).toBeDefined();
    expect(samplingButton).toBeDefined();
    expect(samplingButton).toBeInstanceOf(HTMLButtonElement);

    await userEvent.click(samplingButton as HTMLButtonElement);

    expect(screen.getByText('A - Sampling option: A')).toBeDefined();

    await userEvent.click(screen.getByText('A - Sampling option: A'));

    expect(onChange).toHaveBeenCalledWith('sampling');
    expect(innerFn).toHaveBeenCalledWith(['A']);
  });

  it('type a text somewhere', async () => {
    const onChange = vi.fn();
    const innerFn = vi.fn();
    onChange.mockReturnValue(innerFn);

    await renderWithProps({ onChange });
    const timberMarkInput = screen.getByTestId('timber-mark-text-input');
    expect(timberMarkInput).toBeDefined();

    await userEvent.type(timberMarkInput, 'mark1');
    fireEvent.blur(timberMarkInput);

    expect(onChange).toHaveBeenCalledWith('timberMark');
    expect(innerFn).toHaveBeenCalledWith('mark1');
  });

  it('date picking', async () => {
    const onChange = vi.fn();
    const innerFn = vi.fn();
    onChange.mockReturnValue(innerFn);

    await renderWithProps({ onChange });

    const dateStart = screen.getByTestId('start-date-picker-input-id');
    expect(dateStart).toBeDefined();

    await userEvent.type(dateStart, '2020/01/25');
    fireEvent.blur(dateStart);

    expect(onChange).toHaveBeenCalledWith('updateDateStart');
    expect(innerFn).toHaveBeenCalledWith('2020-01-25');

    const dateEnd = screen.getByTestId('end-date-picker-input-id');
    expect(dateEnd).toBeDefined();

    await userEvent.type(dateEnd, '2020/02/10');
    fireEvent.blur(dateEnd);

    expect(onChange).toHaveBeenCalledWith('updateDateEnd');
    expect(innerFn).toHaveBeenCalledWith('2020-02-10');
  });
});
