import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import AnnouncerProvider from '@/context/announcer/AnnouncerProvider';
import { usePreference } from '@/context/preference/usePreference';

import DistrictSelection from './index';

vi.mock('@/context/preference/usePreference', () => ({
  usePreference: vi.fn(),
}));

const districts = [
  { id: '688', name: 'Campbell River', kind: 'D' },
  { id: '686', name: 'Comox Valley', kind: 'D' },
];

const updatePreferences = vi.fn();

const renderSelection = (noun?: string) =>
  render(
    <AnnouncerProvider>
      <DistrictSelection
        queryHook={() => ({ data: districts, isLoading: false })}
        preferenceKey="selectedDistrict"
        deselectLabel="Select no district"
        searchLabel="Search by district name or code"
        filterFn={(item, keyword) => item.name.toLowerCase().includes(keyword.toLowerCase())}
        announcementNoun={noun}
      />
    </AnnouncerProvider>,
  );

const getAnnouncer = () => screen.getByTestId('app-announcer');

describe('DistrictSelection announcements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePreference).mockReturnValue({
      userPreference: {},
      updatePreferences,
    } as unknown as ReturnType<typeof usePreference>);
  });

  it('announces the selected district by name', async () => {
    const user = userEvent.setup();
    renderSelection();
    await user.click(screen.getByRole('button', { name: /Campbell River/ }));
    expect(updatePreferences).toHaveBeenCalledWith({ selectedDistrict: '688' });
    await waitFor(() =>
      expect(getAnnouncer().textContent).toBe('Selected district: Campbell River'),
    );
  });

  it('announces when the district selection is cleared', async () => {
    const user = userEvent.setup();
    renderSelection();
    await user.click(screen.getByTestId('district-select-none').querySelector('button')!);
    await waitFor(() => expect(getAnnouncer().textContent).toBe('District selection cleared'));
  });

  it('uses the announcement noun when provided (client)', async () => {
    const user = userEvent.setup();
    renderSelection('client');
    await user.click(screen.getByRole('button', { name: /Campbell River/ }));
    await waitFor(() => expect(getAnnouncer().textContent).toBe('Selected client: Campbell River'));
  });
});
