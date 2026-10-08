import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { makeTestQueryClient } from '@/config/tests/renderWithApp';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';

import ClientListing from '.';

let mockedClientValues = [
  {
    clientNumber: '00000001',
    clientName: 'COMPANY ONE',
    name: 'COMPANY ONE',
    legalFirstName: null,
    legalMiddleName: null,
    clientStatusCode: { code: 'ACT', description: 'Active' },
    clientTypeCode: { code: 'C', description: 'Corporation' },
    acronym: 'CORP',
  },
  {
    clientNumber: '00000002',
    clientName: 'COMPANY TWO',
    name: 'COMPANY TWO',
    legalFirstName: null,
    legalMiddleName: null,
    clientStatusCode: { code: 'ACT', description: 'Active' },
    clientTypeCode: { code: 'C', description: 'Corporation' },
    acronym: 'TWO',
  },
  {
    clientNumber: '00000003',
    clientName: 'MINISTRY OF FORESTS',
    name: 'MINISTRY OF FORESTS',
    legalFirstName: null,
    legalMiddleName: null,
    clientStatusCode: { code: 'ACT', description: 'Active' },
    clientTypeCode: { code: 'F', description: 'Ministry of Forests and Range' },
    acronym: 'MOF',
  },
  {
    clientNumber: '00000004',
    clientName: 'MINISTRY OF WATER, LAND AND RESOURCE STEWARDSHIP',
    name: 'MINISTRY OF WATER, LAND AND RESOURCE STEWARDSHIP',
    legalFirstName: null,
    legalMiddleName: null,
    clientStatusCode: { code: 'ACT', description: 'Active' },
    clientTypeCode: { code: 'F', description: 'Ministry of Forests and Range' },
    acronym: 'WLRS',
  },
  {
    clientNumber: '00000005',
    clientName: 'MINISTRY OF CITIZENS SERVICES',
    name: 'MINISTRY OF CITIZENS SERVICES',
    legalFirstName: null,
    legalMiddleName: null,
    clientStatusCode: { code: 'ACT', description: 'Active' },
    clientTypeCode: { code: 'F', description: 'Ministry of Forests and Range' },
    acronym: 'CITZ',
  },
];

const mockUpdatePreferences = vi.fn();

const { mockForestClient } = vi.hoisted(() => ({
  mockForestClient: {
    getForestClient: vi.fn(),
    searchForestClients: vi.fn(),
    searchByClientNumbers: vi.fn(),
    searchMyForestClients: vi.fn(),
  },
}));

vi.mock('@/api/resources/forest-client-resource', () => ({
  ForestClientResource: class {
    getForestClient = mockForestClient.getForestClient;
    searchForestClients = mockForestClient.searchForestClients;
    searchByClientNumbers = mockForestClient.searchByClientNumbers;
    searchMyForestClients = mockForestClient.searchMyForestClients;
  },
}));

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: () => ({
    getClients: () => mockedClientValues.map((c) => c.clientNumber),
  }),
}));

vi.mock('@/context/preference/usePreference', () => ({
  usePreference: () => ({
    userPreference: { selectedClient: null },
    updatePreferences: mockUpdatePreferences,
  }),
}));

// `useAuth` is mocked above, so the real `AuthProvider` is unnecessary here —
// mounting it only adds an unawaited effect that produces act(...) warnings.
const renderWithProviders = async () => {
  const qc = makeTestQueryClient();
  render(
    <QueryClientProvider client={qc}>
      <PreferenceProvider>
        <ClientListing />
      </PreferenceProvider>
    </QueryClientProvider>,
  );
};

describe('ClientListing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedClientValues = [
      {
        clientNumber: '00000001',
        clientName: 'COMPANY ONE',
        name: 'COMPANY ONE',
        legalFirstName: null,
        legalMiddleName: null,
        clientStatusCode: { code: 'ACT', description: 'Active' },
        clientTypeCode: { code: 'C', description: 'Corporation' },
        acronym: 'CORP',
      },
      {
        clientNumber: '00000002',
        clientName: 'COMPANY TWO',
        name: 'COMPANY TWO',
        legalFirstName: null,
        legalMiddleName: null,
        clientStatusCode: { code: 'ACT', description: 'Active' },
        clientTypeCode: { code: 'C', description: 'Corporation' },
        acronym: 'TWO',
      },
      {
        clientNumber: '00000003',
        clientName: 'MINISTRY OF FORESTS',
        name: 'MINISTRY OF FORESTS',
        legalFirstName: null,
        legalMiddleName: null,
        clientStatusCode: { code: 'ACT', description: 'Active' },
        clientTypeCode: { code: 'F', description: 'Ministry of Forests and Range' },
        acronym: 'MOF',
      },
      {
        clientNumber: '00000004',
        clientName: 'MINISTRY OF WATER, LAND AND RESOURCE STEWARDSHIP',
        name: 'MINISTRY OF WATER, LAND AND RESOURCE STEWARDSHIP',
        legalFirstName: null,
        legalMiddleName: null,
        clientStatusCode: { code: 'ACT', description: 'Active' },
        clientTypeCode: { code: 'F', description: 'Ministry of Forests and Range' },
        acronym: 'WLRS',
      },
      {
        clientNumber: '00000005',
        clientName: 'MINISTRY OF CITIZENS SERVICES',
        name: 'MINISTRY OF CITIZENS SERVICES',
        legalFirstName: null,
        legalMiddleName: null,
        clientStatusCode: { code: 'ACT', description: 'Active' },
        clientTypeCode: { code: 'F', description: 'Ministry of Forests and Range' },
        acronym: 'CITZ',
      },
    ];
    (mockForestClient.searchByClientNumbers as Mock).mockResolvedValue(mockedClientValues);
  });

  it('should render ClientListing component successfully', async () => {
    await renderWithProviders();

    const deselectButton = await screen.findByTestId('district-select-none');
    expect(deselectButton).toBeDefined();
  });

  it('should call searchByClientNumbers with correct parameters', async () => {
    await renderWithProviders();

    await screen.findByTestId('district-select-none');

    expect(mockForestClient.searchByClientNumbers).toHaveBeenCalledWith(
      ['00000001', '00000002', '00000003', '00000004', '00000005'],
      0,
      5,
      { signal: expect.any(AbortSignal) },
    );
  });

  it('should transform client data correctly', async () => {
    await renderWithProviders();

    const client1 = await screen.findByTestId('district-select-00000001');
    const client2 = await screen.findByTestId('district-select-00000002');
    const client3 = await screen.findByTestId('district-select-00000003');

    expect(client1).toBeDefined();
    expect(client2).toBeDefined();
    expect(client3).toBeDefined();
  });

  it('should display all clients in the list', async () => {
    await renderWithProviders();

    const client1Name = await screen.findByTitle('COMPANY ONE');
    const client2Name = await screen.findByTitle('COMPANY TWO');
    const client3Name = await screen.findByTitle('MINISTRY OF FORESTS');

    expect(client1Name).toBeDefined();
    expect(client2Name).toBeDefined();
    expect(client3Name).toBeDefined();
  });

  it('should not fetch data when client list is empty', async () => {
    mockedClientValues = [];

    await renderWithProviders();

    // Should not call the API when there are no clients
    expect(mockForestClient.searchByClientNumbers).not.toHaveBeenCalled();
  });

  it('should prefer name over clientName in transformation', async () => {
    mockedClientValues = [
      {
        clientNumber: '00000001',
        clientName: 'WRONG NAME',
        name: 'CORRECT NAME',
        legalFirstName: null,
        legalMiddleName: null,
        clientStatusCode: { code: 'ACT', description: 'Active' },
        clientTypeCode: { code: 'C', description: 'Corporation' },
        acronym: 'TEST',
      },
    ];
    (mockForestClient.searchByClientNumbers as Mock).mockResolvedValue(mockedClientValues);

    await renderWithProviders();

    const clientElement = await screen.findByTitle('CORRECT NAME');
    expect(clientElement).toBeDefined();
  });

  it('should use clientName when name is not available', async () => {
    mockedClientValues = [
      {
        clientNumber: '00000001',
        clientName: 'FALLBACK NAME',
        name: undefined as unknown as string,
        legalFirstName: null,
        legalMiddleName: null,
        clientStatusCode: { code: 'ACT', description: 'Active' },
        clientTypeCode: { code: 'C', description: 'Corporation' },
        acronym: 'TEST',
      },
    ];
    (mockForestClient.searchByClientNumbers as Mock).mockResolvedValue(mockedClientValues);

    await renderWithProviders();

    const clientElement = await screen.findByTitle('FALLBACK NAME');
    expect(clientElement).toBeDefined();
  });

  it('should display deselect option', async () => {
    await renderWithProviders();

    const deselectButton = await screen.findByTestId('district-select-none');
    const deselectLabel = await screen.findByLabelText('Select no client');

    expect(deselectButton).toBeDefined();
    expect(deselectLabel).toBeDefined();
  });

  it('should pass correct props to DistrictSelection', async () => {
    (mockForestClient.searchByClientNumbers as Mock).mockResolvedValue(mockedClientValues);
    await renderWithProviders();

    // Verify search label is rendered
    const searchInput = await screen.findByPlaceholderText('Search by client name or ID');
    expect(searchInput).toBeDefined();
  });
});
