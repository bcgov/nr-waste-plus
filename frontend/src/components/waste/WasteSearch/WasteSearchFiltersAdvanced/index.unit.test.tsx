/* eslint-disable @typescript-eslint/no-explicit-any */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import WasteSearchFiltersAdvanced from './index';
import APIs from '@/services/APIs';

import type { FamLoginUser } from '@/context/auth/types';
import type { ReportingUnitSearchParametersViewDto } from '@/services/search.types';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';

const mockUser = {
  idpProvider: 'IDIR',
} as FamLoginUser;

const mockClients = vi.fn().mockReturnValue(['client1', 'client2']);

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({
    user: mockUser,
    getClients: mockClients,
  }),
}));

vi.mock('@/services/APIs', () => {
  return {
    default: {
      forestclient: {
        getForestClientLocations: vi.fn(),
        searchForestClients: vi.fn(),
        searchMyForestClients: vi.fn(),
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
              isModalOpen={props.isModalOpen ?? true}
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
  beforeEach(() => {
    vi.clearAllMocks();
    mockClients.mockReturnValue(['client1', 'client2']);
  });

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

  it('renders the Client filter with pre-filled value', async () => {
    const filters: ReportingUnitSearchParametersViewDto = {
      clientNumbers: [
        {
          code: 'code',
          description: '1234 ACME Corporation',
        },
      ],
    };

    await renderWithProps({ filters });

    const searchBox = screen.getByTestId('forestclient-client-ac');
    expect(searchBox).toBeDefined();
    expect((searchBox as HTMLInputElement).value).toBe('1234 ACME Corporation');
  });

  it('renders the IDIR or BCeID filter with pre-filled value', async () => {
    const filters: ReportingUnitSearchParametersViewDto = {
      requestUserId: 'JASON',
    };

    await renderWithProps({ filters });

    const searchBox = screen.getByTestId('submitter-name-ac');
    expect(searchBox).toBeDefined();
    expect((searchBox as HTMLInputElement).value).toBe('JASON');
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

  it('auto-resolves client name when only client code is provided (URL params scenario)', async () => {
    const onChange = vi.fn();
    const innerFn = vi.fn();
    onChange.mockReturnValue(innerFn);

    // Simulate what the URL params transform produces: code and description are both
    // the raw client number string, triggering the code-only lookup.
    const filters: ReportingUnitSearchParametersViewDto = {
      clientNumbers: [{ code: '12345', description: '12345' }],
    };

    vi.mocked(APIs.forestclient.searchForestClients).mockResolvedValueOnce([
      { id: '12345', name: 'ACME Corporation', acronym: 'ACME' } as any,
    ]);

    await renderWithProps({ filters, onChange });

    await waitFor(() => {
      expect(APIs.forestclient.searchForestClients).toHaveBeenCalledWith('12345', 0, 1);
      expect(onChange).toHaveBeenCalledWith('clientNumbers');
      expect(innerFn).toHaveBeenCalledWith([
        { code: '12345', description: '12345 ACME Corporation (ACME)' },
      ]);
    });
  });

  it('does NOT trigger the client lookup when a full CodeDescriptionDto is already present', async () => {
    const onChange = vi.fn();

    const filters: ReportingUnitSearchParametersViewDto = {
      clientNumbers: [{ code: '12345', description: '12345 ACME Corporation (ACME)' }],
    };

    await renderWithProps({ filters, onChange });

    // The lookup query should never be fired because the description is already resolved.
    expect(APIs.forestclient.searchForestClients).not.toHaveBeenCalled();
    // onChange should not be called for clientNumbers at all during render.
    expect(onChange).not.toHaveBeenCalledWith('clientNumbers');
  });

  it('does NOT trigger the client lookup while the modal is closed', async () => {
    const onChange = vi.fn();
    const innerFn = vi.fn();
    onChange.mockReturnValue(innerFn);

    const filters: ReportingUnitSearchParametersViewDto = {
      clientNumbers: [{ code: '12345', description: '12345' }],
    };

    await renderWithProps({ filters, onChange, isModalOpen: false });

    expect(APIs.forestclient.searchForestClients).not.toHaveBeenCalled();
    expect(onChange).not.toHaveBeenCalledWith('clientNumbers');
    expect(innerFn).not.toHaveBeenCalled();
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
