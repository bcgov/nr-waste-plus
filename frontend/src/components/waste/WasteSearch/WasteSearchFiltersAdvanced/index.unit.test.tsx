/* eslint-disable @typescript-eslint/no-explicit-any */
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import APIs from '@/services/APIs';

import WasteSearchFiltersAdvanced from './index';

import type { FamLoginUser } from '@/types/auth.types';
import type { ReportingUnitSearchParametersViewDto } from '@/types/search.types';

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
      search: {
        searchReportingUnitUsers: vi.fn(),
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

const renderWithProps = (props: any) =>
  renderWithAppAsync(
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
    />,
  );

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
    // eslint-disable-next-line testing-library/no-node-access
    const samplingButton = within(samplingBox.parentElement!).getByRole('button');

    expect(samplingBox).toBeDefined();
    expect(samplingButton).toBeDefined();
    expect(samplingButton).toBeInstanceOf(HTMLButtonElement);

    await userEvent.click(samplingButton as HTMLButtonElement);

    screen.getByText('A - Sampling option: A');

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

  it('renders the district/sampling/status multiselects with matching selections', async () => {
    const districtOptions = [
      { code: 'DCC', description: 'Cariboo-Chilcotin' },
      { code: 'DSC', description: 'Sunshine Coast' },
    ];
    const samplingOptions = [
      { code: 'AVG', description: 'Average' },
      { code: 'OCU', description: 'Ocular' },
    ];
    const statusOptions = [
      { code: 'SUB', description: 'Submitted' },
      { code: 'DFT', description: 'Draft' },
    ];
    const filters: ReportingUnitSearchParametersViewDto = {
      district: ['DCC'],
      sampling: ['OCU'],
      status: ['DFT'],
    };

    await renderWithProps({ filters, districtOptions, samplingOptions, statusOptions });

    // Each multiselect's selectedItems filter (lines 145-147, 160-162, 175-177)
    // resolves one match from the option list: three fields each report one
    // selected item.
    expect(screen.getAllByText(/Total items selected:\s*1/).length).toBe(3);
    screen.getByText('District');
    screen.getByText('Sampling option');
    screen.getByText('Status');
  });

  it('renders BCeID client multiselect and runs the query select callback', async () => {
    mockUser.idpProvider = 'BCEIDBUSINESS';
    mockClients.mockReturnValue(['client1']);
    vi.mocked(APIs.forestclient.searchMyForestClients).mockResolvedValue({
      content: [
        {
          client: { code: '00010005', description: 'JACOB FEHR' },
          submissionsCount: 1,
          blocksCount: 2,
          lastUpdate: '2025-01-16T10:00:00',
        },
      ],
      page: { number: 0, size: 10, totalElements: 1, totalPages: 1 },
    } as never);

    await renderWithProps({});

    // BCeID branch of AdvancedFilterClientInput (multiselect, not autocomplete).
    expect(screen.queryByTestId('forestclient-client-ac')).toBeNull();
    expect(screen.getAllByTestId('as-client-multi-select').length).toBeGreaterThan(0);

    // The select callback (line 102) maps content rows to their client entry
    // when the query resolves.
    await waitFor(() => {
      expect(APIs.forestclient.searchMyForestClients).toHaveBeenCalled();
    });
  });

  describe('source toggle (#1238)', () => {
    it('renders the toggle checked by default (no legacy flag means legacy)', async () => {
      await renderWithProps({});

      const toggle = screen.getByRole('switch', { name: 'Read from legacy' });
      expect(toggle.getAttribute('aria-checked')).toBe('true');
    });

    it('renders the toggle unchecked when legacy=false is set', async () => {
      await renderWithProps({ filters: { ...defaultFilters, legacy: false } });

      const toggle = screen.getByRole('switch', { name: 'Read from legacy' });
      expect(toggle.getAttribute('aria-checked')).toBe('false');
    });

    it('updates the legacy flag when the toggle flips', async () => {
      const innerFn = vi.fn();
      const onChange = vi.fn(() => innerFn);
      await renderWithProps({ onChange });

      await userEvent.click(screen.getByRole('switch', { name: 'Read from legacy' }));

      expect(onChange).toHaveBeenCalledWith('legacy');
      expect(innerFn).toHaveBeenCalledWith(false);
    });
  });
});

describe('WasteSearchFiltersAdvanced submitter autocomplete', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.idpProvider = 'IDIR';
    mockClients.mockReturnValue(['client1', 'client2']);
  });

  const submitterFilters: ReportingUnitSearchParametersViewDto = { requestUserId: '' };

  it('returns the raw string when a submitter option is a plain string', async () => {
    vi.mocked(APIs.search.searchReportingUnitUsers).mockResolvedValue(['JASON', 'MARIA']);

    await renderWithProps({ filters: submitterFilters });

    const input = screen.getByTestId('submitter-name-ac');
    await userEvent.type(input, 'ja');

    // Object-covered path for a string item (line 241).
    const option = await screen.findByRole('option', { name: /JASON/ }, { timeout: 2000 });
    expect(option).toBeDefined();
    expect(option.textContent).toBe('JASON');
  });

  it('joins a character-indexed object into a string (lines 244-246)', async () => {
    // A character-indexed object, as produced by some legacy user APIs.
    const charIndexed = { 0: 'J', 1: 'A', 2: 'S', 3: 'O', 4: 'N' };
    vi.mocked(APIs.search.searchReportingUnitUsers).mockResolvedValue([charIndexed]);

    await renderWithProps({ filters: submitterFilters });

    const input = screen.getByTestId('submitter-name-ac');
    await userEvent.type(input, 'ja');

    // itemToString detects the char-indexed object and joins values (line 246).
    const option = await screen.findByRole('option', { name: /JASON/ }, { timeout: 2000 });
    expect(option).toBeDefined();
  });

  it('returns an empty label for an object that is not character-indexed (line 249)', async () => {
    vi.mocked(APIs.search.searchReportingUnitUsers).mockResolvedValue([
      { name: 'JASON', value: 'not-char-indexed' },
    ]);

    await renderWithProps({ filters: submitterFilters });

    const input = screen.getByTestId('submitter-name-ac');
    await userEvent.type(input, 'ja');

    await waitFor(() => {
      expect(APIs.search.searchReportingUnitUsers).toHaveBeenCalledWith('ja');
    });
    // Options render even though the label resolves to '' (fall-through).
    const combobox = screen.getByTestId('submitter-name-ac');
    expect(combobox).toBeDefined();
  });

  it('passes the selected submitter up through onChange (onSelect, lines 251-253)', async () => {
    vi.mocked(APIs.search.searchReportingUnitUsers).mockResolvedValue(['JASON']);
    const onChange = vi.fn();
    const innerFn = vi.fn();
    onChange.mockReturnValue(innerFn);

    await renderWithProps({ filters: submitterFilters, onChange });

    const input = screen.getByTestId('submitter-name-ac');
    await userEvent.type(input, 'ja');

    const option = await screen.findByRole('option', { name: /JASON/ }, { timeout: 2000 });
    await userEvent.click(option);

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith('requestUserId');
      expect(innerFn).toHaveBeenCalledWith('JASON');
    });
  });
});
