import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import APIs from '@/services/APIs';

import HeaderDistrictDisplay from '.';

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

const renderWithProviders = async (active: boolean) => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <AuthProvider>
        <QueryClientProvider client={qc}>
          <PreferenceProvider>
            <HeaderDistrictDisplay isActive={active} />
          </PreferenceProvider>
        </QueryClientProvider>
      </AuthProvider>,
    ),
  );
};

describe('HeaderDistrictDisplay', () => {
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
    (APIs.forestclient.searchByClientNumbers as Mock).mockResolvedValue(mockedClientValues);
  });
  it('small size or no client should not display anything', async () => {
    mockedClientValues = [];
    mockBreakpoint = 'sm';

    await renderWithProviders(false);
    const name = screen.queryByTestId('client-name');
    expect(name).toBeNull();
  });

  it('max size and no client should not display anything', async () => {
    mockedClientValues = [];
    mockBreakpoint = 'max';

    await renderWithProviders(false);
    const name = screen.queryByTestId('client-name');
    expect(name).toBeNull();
  });

  it('small size with client should not display anything', async () => {
    mockBreakpoint = 'sm';

    await renderWithProviders(false);
    const name = screen.queryByTestId('client-name');
    expect(name).toBeNull();
  });

  it('no client selected should display that', async () => {
    mockBreakpoint = 'max';

    await renderWithProviders(false);
    const name = await screen.findByTestId('client-name');
    expect(name).toBeDefined();
    expect(name.textContent).toBe('Client name not available');
  });
});
