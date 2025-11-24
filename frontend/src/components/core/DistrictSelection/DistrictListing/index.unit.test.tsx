import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, type Mock } from 'vitest';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import APIs from '@/services/APIs';

import DistrictListing from './index';

const mockedClientValues = [
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
    codes: {
      getDistricts: vi.fn(),
    },
  },
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
            <DistrictListing />
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

describe('DistrictListing', () => {
  it('render multiple entries and select none', async () => {
    (APIs.codes.getDistricts as Mock).mockResolvedValue(mockedClientValues);
    mockedPreference = { selectedDistrict: 'ABC' };
    await renderWithProviders();
    await checkSelected('none', false);
    await checkSelected('ABC', true);
    await checkSelected('DEF', false);
    await checkSelected('GHI', false);
  });

  it('render selected item, other than none', async () => {
    (APIs.codes.getDistricts as Mock).mockResolvedValue(mockedClientValues);
    mockedPreference = { selectedDistrict: '' };
    await renderWithProviders();
    await checkSelected('none', true);
    await checkSelected('ABC', false);
    await checkSelected('DEF', false);
    await checkSelected('GHI', false);
  });

  it('render none was selected, but then selected DEF', async () => {
    (APIs.codes.getDistricts as Mock).mockResolvedValue(mockedClientValues);
    mockedPreference = { selectedDistrict: '' };
    await renderWithProviders();
    await checkSelected('none', true);
    await checkSelected('ABC', false);
    await checkSelected('GHI', false);
    const secondEntryBtn = await checkSelected('DEF', false);

    await act(async () => userEvent.click(secondEntryBtn));
    expect(mockUpdatePreferences).toHaveBeenCalledWith({ selectedDistrict: 'DEF' });
  });
});
