import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import { makeTestQueryClient } from '@/config/tests/renderWithApp';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import API from '@/services/APIs';

import DistrictDisplay from '.';

let mockBreakpoint = 'md';
let mockedDistrictValues = [
  { code: 'ABC', description: 'District A' },
  { code: 'DEF', description: 'District B' },
  { code: 'GHI', description: 'District C' },
  { code: 'JKL', description: 'District D' },
];
let mockedPreference = { selectedDistrict: '' };
const mockUpdatePreferences = vi.fn();

vi.mock('@/services/APIs', () => ({
  default: {
    codes: {
      getDistricts: vi.fn(),
    },
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
    getClients: () => [],
  }),
}));

vi.mock('@/context/preference/usePreference', () => ({
  usePreference: () => ({
    userPreference: mockedPreference,
    updatePreferences: mockUpdatePreferences,
  }),
}));

const renderWithProviders = async (active: boolean) => {
  const qc = makeTestQueryClient();
  render(
    <QueryClientProvider client={qc}>
      <PreferenceProvider>
        <DistrictDisplay isActive={active} />
      </PreferenceProvider>
    </QueryClientProvider>,
  );
};

describe('DistrictDisplay', () => {
  beforeEach(() => {
    mockedPreference = { selectedDistrict: '' };
    mockedDistrictValues = [
      { code: 'ABC', description: 'District A' },
      { code: 'DEF', description: 'District B' },
      { code: 'GHI', description: 'District C' },
      { code: 'JKL', description: 'District D' },
    ];
    (API.codes.getDistricts as Mock).mockResolvedValue(mockedDistrictValues);
  });

  it('small size or no district should not display anything', async () => {
    mockedDistrictValues = [];
    mockBreakpoint = 'sm';

    await renderWithProviders(false);
    await waitFor(() => {
      const name = screen.queryByTestId('client-name');
      expect(name).toBeNull();
    });
  });

  it('small size with district should not display anything', async () => {
    mockBreakpoint = 'sm';
    mockedPreference = { selectedDistrict: 'DEF' };

    await renderWithProviders(false);
    await waitFor(() => {
      const name = screen.queryByTestId('client-name');
      expect(name).toBeNull();
    });
  });

  it('no district selected should display that', async () => {
    mockBreakpoint = 'max';

    await renderWithProviders(false);
    const name = await screen.findByTestId('client-name');
    expect(name).toBeDefined();
    expect(name.textContent).toBe('No district selected');
  });

  it('no district selected and is active', async () => {
    mockBreakpoint = 'max';

    await renderWithProviders(true);
    const name = await screen.findByTestId('client-name');
    expect(name).toBeDefined();
    expect(name.textContent).toBe('No district selected');

    const isActive = await screen.findByTestId('active');
    expect(isActive).toBeDefined();
  });

  it('district selected should display district name', async () => {
    mockBreakpoint = 'max';
    mockedPreference = { selectedDistrict: 'DEF' };

    await renderWithProviders(false);
    const name = await screen.findByTestId('client-name');
    expect(name.textContent).toBe('District B');

    const isInactive = await screen.findByTestId('inactive');
    expect(isInactive).toBeDefined();
  });

  it('district selected and is active', async () => {
    mockBreakpoint = 'max';
    mockedPreference = { selectedDistrict: 'ABC' };

    await renderWithProviders(true);
    const name = await screen.findByTestId('client-name');
    expect(name.textContent).toBe('District A');

    const isActive = await screen.findByTestId('active');
    expect(isActive).toBeDefined();
  });
});
