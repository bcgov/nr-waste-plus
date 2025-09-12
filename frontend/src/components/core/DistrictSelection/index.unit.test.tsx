import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, type Mock } from 'vitest';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import APIs from '@/services/APIs';

import DistrictSelection from './index';

const mockedClientValues = [
  {
    clientNumber: '00000001',
    clientName: 'COMPANY ONE',
    legalFirstName: null,
    legalMiddleName: null,
    clientStatusCode: { code: 'ACT', description: 'Active' },
    clientTypeCode: { code: 'C', description: 'Corporation' },
    acronym: 'CORP',
  },
  {
    clientNumber: '00000002',
    clientName: 'COMPANY TWO',
    legalFirstName: null,
    legalMiddleName: null,
    clientStatusCode: { code: 'ACT', description: 'Active' },
    clientTypeCode: { code: 'C', description: 'Corporation' },
    acronym: 'TWO',
  },
  {
    clientNumber: '00000003',
    clientName: 'MINISTRY OF FORESTS',
    legalFirstName: null,
    legalMiddleName: null,
    clientStatusCode: { code: 'ACT', description: 'Active' },
    clientTypeCode: { code: 'F', description: 'Ministry of Forests and Range' },
    acronym: 'MOF',
  },
  {
    clientNumber: '00000004',
    clientName: 'TIMBER SALES',
    legalFirstName: null,
    legalMiddleName: null,
    clientStatusCode: { code: 'ACT', description: 'Active' },
    clientTypeCode: { code: 'F', description: 'Ministry of Forests and Range' },
    acronym: 'TBA',
  },
];

let mockedPreference = { selectedClient: '' };
const mockUpdatePreferences = vi.fn();

vi.mock('@/services/APIs', () => ({
  default: {
    forestclient: {
      searchByClientNumbers: vi.fn(),
    },
  },
}));

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({
    getClients: () => mockedClientValues.map((c) => c.clientNumber),
  }),
}));

vi.mock('@/context/preference/usePreference', () => ({
  usePreference: () => ({
    userPreference: mockedPreference,
    updatePreferences: mockUpdatePreferences,
  }),
}));

const renderWithProviders = async () => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <AuthProvider>
        <QueryClientProvider client={qc}>
          <PreferenceProvider>
            <DistrictSelection />
          </PreferenceProvider>
        </QueryClientProvider>
      </AuthProvider>,
    ),
  );
};

const checkSelected = async (clientNumber: string, selected: boolean) => {
  const entry = await screen.findByTestId(`district-select-${clientNumber}`);
  expect(entry).toBeDefined();
  const button = within(entry).getByRole('button');
  expect(button.classList.contains('selected-district')).toBe(selected);
  return button;
};

describe('DistrictSelection', () => {
  it('render multiple entries and select none', async () => {
    (APIs.forestclient.searchByClientNumbers as Mock).mockResolvedValue(mockedClientValues);
    mockedPreference = { selectedClient: '00000001' };
    await renderWithProviders();
    await checkSelected('none', false);
    await checkSelected('00000001', true);
    await checkSelected('00000002', false);
    await checkSelected('00000003', false);
    await checkSelected('00000004', false);
  });

  it('render selected item, other than none', async () => {
    (APIs.forestclient.searchByClientNumbers as Mock).mockResolvedValue(mockedClientValues);
    mockedPreference = { selectedClient: '' };
    await renderWithProviders();
    await checkSelected('none', true);
    await checkSelected('00000001', false);
    await checkSelected('00000002', false);
    await checkSelected('00000003', false);
    await checkSelected('00000004', false);
  });

  it('render none was selected, but then selected 00000002', async () => {
    (APIs.forestclient.searchByClientNumbers as Mock).mockResolvedValue(mockedClientValues);
    mockedPreference = { selectedClient: '' };
    await renderWithProviders();
    await checkSelected('none', true);
    await checkSelected('00000001', false);
    await checkSelected('00000003', false);
    await checkSelected('00000004', false);
    const secondEntryBtn = await checkSelected('00000002', false);

    await act(async () => userEvent.click(secondEntryBtn));
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ selectedClient: '00000002' });
  });
});
