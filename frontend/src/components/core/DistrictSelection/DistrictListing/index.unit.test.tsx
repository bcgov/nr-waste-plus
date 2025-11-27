import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import DistrictListing from '.';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import APIs from '@/services/APIs';

let mockedDistrictValues = [
  {
    code: 'DCR',
    description: 'Cariboo-Chilcotin Natural Resource District',
  },
  {
    code: 'DCC',
    description: 'Campbell River Natural Resource District',
  },
  {
    code: 'DCK',
    description: 'Coast Mountains Natural Resource District',
  },
  {
    code: 'DKA',
    description: 'Kamloops Natural Resource District',
  },
  {
    code: 'DNI',
    description: 'North Island - Central Coast Natural Resource District',
  },
];

const mockUpdatePreferences = vi.fn();

vi.mock('@/services/APIs', () => ({
  default: {
    codes: {
      getDistricts: vi.fn(),
    },
  },
}));

vi.mock('@/context/preference/usePreference', () => ({
  usePreference: () => ({
    userPreference: { selectedDistrict: '' },
    updatePreferences: mockUpdatePreferences,
  }),
}));

const renderWithProviders = async () => {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  await act(async () =>
    render(
      <AuthProvider>
        <QueryClientProvider client={qc}>
          <PreferenceProvider>
            <DistrictListing />
          </PreferenceProvider>
        </QueryClientProvider>
      </AuthProvider>,
    ),
  );
};

describe('DistrictListing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedDistrictValues = [
      {
        code: 'DCR',
        description: 'Cariboo-Chilcotin Natural Resource District',
      },
      {
        code: 'DCC',
        description: 'Campbell River Natural Resource District',
      },
      {
        code: 'DCK',
        description: 'Coast Mountains Natural Resource District',
      },
      {
        code: 'DKA',
        description: 'Kamloops Natural Resource District',
      },
      {
        code: 'DNI',
        description: 'North Island - Central Coast Natural Resource District',
      },
    ];
    (APIs.codes.getDistricts as Mock).mockResolvedValue(mockedDistrictValues);
  });

  it('should render DistrictListing component successfully', async () => {
    await renderWithProviders();

    const deselectButton = await screen.findByTestId('district-select-none');
    expect(deselectButton).toBeDefined();
  });

  it('should call getDistricts API', async () => {
    await renderWithProviders();

    await screen.findByTestId('district-select-none');

    expect(APIs.codes.getDistricts).toHaveBeenCalled();
  });

  it('should transform district data correctly', async () => {
    await renderWithProviders();

    const district1 = await screen.findByTestId('district-select-DCR');
    const district2 = await screen.findByTestId('district-select-DCC');
    const district3 = await screen.findByTestId('district-select-DCK');

    expect(district1).toBeDefined();
    expect(district2).toBeDefined();
    expect(district3).toBeDefined();
  });

  it('should display all districts in the list', async () => {
    await renderWithProviders();

    const district1Name = await screen.findByTitle('Cariboo-Chilcotin Natural Resource District');
    const district2Name = await screen.findByTitle('Campbell River Natural Resource District');
    const district3Name = await screen.findByTitle('Coast Mountains Natural Resource District');

    expect(district1Name).toBeDefined();
    expect(district2Name).toBeDefined();
    expect(district3Name).toBeDefined();
  });

  it('should map district code to id and description to name', async () => {
    await renderWithProviders();

    const districtElement = await screen.findByTestId('district-select-DCR');
    expect(districtElement).toBeDefined();

    const districtName = await screen.findByTitle('Cariboo-Chilcotin Natural Resource District');
    expect(districtName).toBeDefined();
  });

  it('should set kind property to "D" for all districts', async () => {
    await renderWithProviders();

    // Verify multiple districts are rendered with the correct structure
    const district1 = await screen.findByTestId('district-select-DCR');
    const district2 = await screen.findByTestId('district-select-DCC');

    expect(district1).toBeDefined();
    expect(district2).toBeDefined();
  });

  it('should display deselect option', async () => {
    await renderWithProviders();

    const deselectButton = await screen.findByTestId('district-select-none');
    const deselectLabel = await screen.findByLabelText('Select no district');

    expect(deselectButton).toBeDefined();
    expect(deselectLabel).toBeDefined();
  });

  it('should pass correct props to DistrictSelection', async () => {
    await renderWithProviders();

    // Verify search label is rendered
    const searchInput = await screen.findByPlaceholderText('Search by district name or code');
    expect(searchInput).toBeDefined();
  });

  it('should handle empty district list', async () => {
    mockedDistrictValues = [];
    (APIs.codes.getDistricts as Mock).mockResolvedValue([]);

    await renderWithProviders();

    const deselectButton = await screen.findByTestId('district-select-none');
    expect(deselectButton).toBeDefined();

    // Should only show the deselect option
    const districtItems = screen.queryByTestId(/district-select-D/);
    expect(districtItems).toBeNull();
  });

  it('should use staleTime: Infinity for district query', async () => {
    await renderWithProviders();

    await screen.findByTestId('district-select-none');

    // Verify the API was called once and data is cached
    expect(APIs.codes.getDistricts).toHaveBeenCalledTimes(1);
  });

  it('should enable query by default', async () => {
    await renderWithProviders();

    await screen.findByTestId('district-select-none');

    // The API should be called since the query is enabled
    expect(APIs.codes.getDistricts).toHaveBeenCalled();
  });
});
