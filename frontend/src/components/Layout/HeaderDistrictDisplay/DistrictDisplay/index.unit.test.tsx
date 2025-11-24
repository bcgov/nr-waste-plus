import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import APIs from '@/services/APIs';

import DistrictDisplay from '.';

let mockBreakpoint = 'md';
let mockedClientValues = [
  {
    code: 'ABC',
    description: 'District A',
  },
  {
    code: 'DEF',
    description: 'District B',
  },
  {
    code: 'GHI',
    description: 'District C',
  },
  {
    code: 'JKL',
    description: 'District D',
  },
];
let mockedPreference = { selectedDistrict: '' };
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
    getClients: () => mockedClientValues.map((c) => c.code),
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
            <DistrictDisplay isActive={active} />
          </PreferenceProvider>
        </QueryClientProvider>
      </AuthProvider>,
    ),
  );
};

describe('DistrictDisplay', () => {
  beforeEach(() => {
    mockedPreference = { selectedDistrict: '' };
    mockedClientValues = [
      {
        code: 'ABC',
        description: 'District A',
      },
      {
        code: 'DEF',
        description: 'District B',
      },
      {
        code: 'GHI',
        description: 'District C',
      },
      {
        code: 'JKL',
        description: 'District D',
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

  it('small size with client should not display anything', async () => {
    mockBreakpoint = 'sm';
    mockedPreference = { selectedDistrict: 'DEF' };

    await renderWithProviders(false);
    const name = screen.queryByTestId('client-name');
    expect(name).toBeNull();
  });

  it('no client selected should display that', async () => {
    mockBreakpoint = 'max';

    await renderWithProviders(false);
    const name = await screen.findByTestId('client-name');
    expect(name).toBeDefined();
    expect(name.textContent).toBe('No district selected');
  });

  it('no client selected and is active', async () => {
    mockBreakpoint = 'max';

    await renderWithProviders(true);
    const name = await screen.findByTestId('client-name');
    expect(name).toBeDefined();
    expect(name.textContent).toBe('No district selected');

    const isActive = await screen.findByTestId('active');
    expect(isActive).toBeDefined();
  });
});
