import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';

import { LayoutHeader } from '@/components/Layout/LayoutHeader';
import { AuthProvider } from '@/context/auth/AuthProvider';
import { LayoutProvider } from '@/context/layout/LayoutProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import ThemeProvider from '@/context/theme/ThemeProvider';
import APIs from '@/services/APIs';

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

const renderWithProviders = async () => {
  const qc = new QueryClient();
  await act(async () =>
    render(
      <AuthProvider>
        <QueryClientProvider client={qc}>
          <MemoryRouter>
            <PreferenceProvider>
              <ThemeProvider>
                <LayoutProvider>
                  <LayoutHeader />
                </LayoutProvider>
              </ThemeProvider>
            </PreferenceProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </AuthProvider>,
    ),
  );
};

describe('LayoutHeader', () => {
  beforeEach(() => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });
    (APIs.user.updateUserPreferences as Mock).mockResolvedValue({});
  });

  it('renders header with title Waste Plus', async () => {
    await renderWithProviders();
    const header = await screen.findByTestId('bc-header__header');
    expect(header).toBeDefined();

    const title = await screen.findByText(/Waste Plus/i);
    expect(title).toBeDefined();
  });

  it('toggles side nav when menu button is clicked', async () => {
    await renderWithProviders();

    const toggleButton = await screen.findByLabelText(/open menu/i);
    expect(toggleButton).toBeDefined();

    fireEvent.click(toggleButton);

    // After toggling once, aria-label should change to "Close menu"
    expect(screen.getByLabelText(/close menu/i)).toBeDefined();
  });
});
