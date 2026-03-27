import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, type Mock, beforeAll } from 'vitest';

import { LayoutHeader } from '@/components/Layout/LayoutHeader';
import { AuthProvider } from '@/context/auth/AuthProvider';
import { LayoutProvider } from '@/context/layout/LayoutProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import ThemeProvider from '@/context/theme/ThemeProvider';
import APIs from '@/services/APIs';

let mockBreakpoint = 'md';
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

vi.mock('@/hooks/useBreakpoint', () => ({
  default: () => mockBreakpoint,
}));

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
    mockBreakpoint = 'lg';

    await renderWithProviders();
    const header = await screen.findByTestId('bc-header__header');
    expect(header).toBeDefined();

    const title = await screen.findByText(/Waste Plus/i);
    expect(title).toBeDefined();
  });

  describe('when VITE_NODE_ENV starts with "openshift-"', () => {
    describe('and VITE_NODE_ENV ends with "prod"', () => {
      beforeAll(async () => {
        const { env } = await import('@/env');
        env.VITE_NODE_ENV = 'openshift-prod';
      });

      it("doesn't render the Env label", async () => {
        await renderWithProviders();

        expect(screen.queryByText(/Env/i)).toBeNull();
      });
    });

    describe('and VITE_NODE_ENV doesn\'t end with "prod"', () => {
      beforeAll(async () => {
        const { env } = await import('@/env');
        env.VITE_NODE_ENV = 'openshift-test';
      });

      it('renders the Env label', async () => {
        await renderWithProviders();

        expect(screen.queryByText(/Env/i)).toBeDefined();

        const envLabel = await screen.findByText('Env. Test');
        expect(envLabel).toBeDefined();
      });
    });
  });

  describe('when VITE_NODE_ENV doesn\'t start with "openshift-"', () => {
    beforeAll(async () => {
      const { env } = await import('@/env');
      env.VITE_NODE_ENV = 'bogus-test';
    });

    it('renders the Env label but the name is empty', async () => {
      await renderWithProviders();

      expect(screen.queryByText(/Env/i)).toBeDefined();

      const envLabel = await screen.findByText('Env.');
      expect(envLabel).toBeDefined();

      expect(screen.queryByText(/Bogus/i)).toBeNull();
      expect(screen.queryByText(/Test/i)).toBeNull();
    });
  });
});
