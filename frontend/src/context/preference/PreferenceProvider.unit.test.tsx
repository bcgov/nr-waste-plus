import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { makeTestQueryClient } from '@/config/tests/renderWithApp';
import { AuthContext } from '@/context/auth/AuthContext';
import { type FamLoginUser } from '@/types/auth.types';

import { PreferenceProvider } from './PreferenceProvider';
import { usePreference } from './usePreference';
import { loadUserPreference, saveUserPreference } from './utils';

vi.mock('./utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./utils')>();
  return {
    ...actual,
    loadUserPreference: vi.fn(),
    saveUserPreference: vi.fn(),
  };
});

const TestComponent = () => {
  const { userPreference, updatePreferences, isLoaded } = usePreference();
  return (
    <>
      <span data-testid="theme">{userPreference.theme}</span>
      <span data-testid="loaded">{String(isLoaded)}</span>
      <button onClick={() => updatePreferences({ theme: 'g90' })}>Set theme</button>
      <button onClick={() => updatePreferences({ panels: ['x'] })}>Set panels</button>
      <button onClick={() => updatePreferences({ panels: [] })}>Clear panels</button>
    </>
  );
};

const renderWithProviders = (authValue?: unknown) => {
  const qc = makeTestQueryClient();
  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={authValue}>
        <PreferenceProvider>
          <TestComponent />
        </PreferenceProvider>
      </AuthContext.Provider>
    </QueryClientProvider>,
  );
};

describe('PreferenceProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads preferences when auth not provided', async () => {
    (loadUserPreference as Mock).mockResolvedValue({ theme: 'g10' });
    renderWithProviders(undefined);
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    expect(screen.getByTestId('theme').textContent).toBe('g10');
  });

  it('does not load when auth loading', async () => {
    (loadUserPreference as Mock).mockResolvedValue({ theme: 'g10' });
    renderWithProviders({ isLoading: true, user: undefined });
    await waitFor(() => expect(loadUserPreference).not.toHaveBeenCalled());
  });

  it('loads with userId from providerUsername', async () => {
    (loadUserPreference as Mock).mockResolvedValue({ theme: 'g90' });
    const user: Partial<FamLoginUser> = { providerUsername: 'IDIR\\user' };
    renderWithProviders({ isLoading: false, user });
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    expect(screen.getByTestId('theme').textContent).toBe('g90');
  });

  it('updates preferences and calls mutate', async () => {
    const user = userEvent.setup();
    (loadUserPreference as Mock).mockResolvedValue({ theme: 'g10' });
    (saveUserPreference as Mock).mockResolvedValue({ theme: 'g90' });
    renderWithProviders(undefined);
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    await user.click(screen.getByText('Set theme'));
    expect(saveUserPreference).toHaveBeenCalled();
  });

  it('handles array merge replacement', async () => {
    const user = userEvent.setup();
    (loadUserPreference as Mock).mockResolvedValue({ theme: 'g10', panels: ['a'] });
    (saveUserPreference as Mock).mockResolvedValue({ theme: 'g10', panels: ['x'] });
    renderWithProviders(undefined);
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    await user.click(screen.getByText('Set panels'));
    expect(saveUserPreference).toHaveBeenCalled();
  });

  it('keeps array when empty array passed', async () => {
    const user = userEvent.setup();
    (loadUserPreference as Mock).mockResolvedValue({ theme: 'g10', panels: ['a'] });
    (saveUserPreference as Mock).mockResolvedValue({ theme: 'g10', panels: ['a'] });
    renderWithProviders(undefined);
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    await user.click(screen.getByText('Clear panels'));
    expect(saveUserPreference).not.toHaveBeenCalled();
  });
});
