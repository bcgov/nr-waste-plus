import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import ClientDisplay from '.';

import type { UserPreference } from '@/context/preference/types';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import APIs from '@/services/APIs';

let mockBreakpoint = 'md';
let mockedClientValues = [
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
let mockedPreference = { selectedClient: null } as Partial<UserPreference>;
const mockUpdatePreferences = vi.fn();

vi.mock('@/services/APIs', () => ({
  default: {
    forestclient: {
      searchByClientNumbers: vi.fn(),
    },
  },
}));

vi.mock('@/hooks/useBreakpoint', () => ({
  default: () => mockBreakpoint,
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

const renderWithProviders = async (active: boolean) => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <AuthProvider>
        <QueryClientProvider client={qc}>
          <PreferenceProvider>
            <ClientDisplay isActive={active} />
          </PreferenceProvider>
        </QueryClientProvider>
      </AuthProvider>,
    ),
  );
};

describe('ClientDisplay', () => {
  beforeEach(() => {
    mockedClientValues = [
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
    mockedPreference = { selectedClient: null };
    (APIs.forestclient.searchByClientNumbers as Mock).mockResolvedValue(mockedClientValues);
  });

  it('small size or no client should not display anything', async () => {
    mockedClientValues = [];
    mockBreakpoint = 'sm';

    await renderWithProviders(false);
    const name = screen.queryByTestId('client-name');
    expect(name).toBeNull();
  });

  it('small size with client should not display anything', async () => {
    mockBreakpoint = 'sm';
    mockedPreference = {
      selectedClient: {
        code: '00000004',
        description: '00000004 TIMBER SALES (TBA)',
      },
    };

    await renderWithProviders(false);
    const name = screen.queryByTestId('client-name');
    expect(name).toBeNull();
  });

  it('no client selected should display nothing', async () => {
    mockBreakpoint = 'max';

    await renderWithProviders(false);
    const isActive = await screen.findByTestId('inactive');
    expect(isActive).toBeDefined();

    const name = await screen.findByTestId('client-name');
    expect(name).toBeDefined();
    expect(name.textContent).toBe('No client selected');
  });
});
