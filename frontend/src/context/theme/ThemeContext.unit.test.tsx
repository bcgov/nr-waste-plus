import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, type Mock } from 'vitest';

import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import { CARBON_THEMES } from '@/context/preference/types';
import APIs from '@/services/APIs';

import { ThemeProvider } from './ThemeProvider';
import { useTheme } from './useTheme';

vi.mock('@/services/APIs', () => {
  return {
    default: {
      user: {
        getUserPreferences: vi.fn(),
        updateUserPreferences: vi.fn(),
      },
    },
  };
});

const TestComponent = () => {
  const { theme, setTheme, toggleTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme-value">{theme}</span>
      <button onClick={() => setTheme('g100')}>Set g100</button>
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
};

const renderWithProviders = async () => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <QueryClientProvider client={qc}>
        <PreferenceProvider>
          <ThemeProvider>
            <TestComponent />
          </ThemeProvider>
        </PreferenceProvider>
      </QueryClientProvider>,
    ),
  );
};

describe('ThemeContext', () => {
  it('provides the default theme', async () => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValueOnce({ theme: 'g10' });
    await renderWithProviders();
    expect(screen.getByTestId('theme-value').textContent).toBe('g10');
  });

  it('setTheme changes the theme', async () => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValueOnce({ theme: 'g10' });
    await renderWithProviders();
    act(() => screen.getByText('Set g100').click());
    expect(CARBON_THEMES).toContain(screen.getByTestId('theme-value').textContent);
    expect(screen.getByTestId('theme-value').textContent).toBe('g100');
  });

  it('toggleTheme toggles between g10 and g100', async () => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });
    (APIs.user.updateUserPreferences as Mock).mockResolvedValue({});
    await renderWithProviders();

    // Default is g10, toggle should set to g100
    act(() => screen.getByText('Toggle').click());
    await waitFor(() => {
      expect(screen.getByTestId('theme-value').textContent).toBe('g100');
    });

    // Toggle again should set back to g10
    act(() => screen.getByText('Toggle').click());
    await waitFor(() => {
      expect(screen.getByTestId('theme-value').textContent).toBe('g10');
    });
  });

  it('throws if useTheme is used outside of ThemeProvider', async () => {
    expect(() => render(<TestComponent />)).toThrow('useTheme must be used within a ThemeProvider');
  });
});
