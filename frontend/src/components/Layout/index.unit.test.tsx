import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';
import { act, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, type Mock } from 'vitest';

import Layout from './index';

import { AuthProvider } from '@/context/auth/AuthProvider';
import { createTestRouter } from '@/config/tests/routerTestHelper';
import { LayoutProvider } from '@/context/layout/LayoutProvider';
import { PreferenceProvider } from '@/context/preference/PreferenceProvider';
import ThemeProvider from '@/context/theme/ThemeProvider';
import APIs from '@/services/APIs';

vi.mock('@/routes/routePaths', () => ({
  getMenuEntries: () => [
    {
      id: 'Dashboard',
      path: '/dashboard',
      isMenuItem: true,
    },
    {
      id: 'Settings',
      path: '/settings',
      isMenuItem: true,
      children: [
        {
          id: 'Profile',
          path: 'profile',
          isMenuItem: true,
        },
      ],
    },
  ],
}));

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

// Dummy child component for testing
const DummyChild = () => <div data-testid="dummy-child">Hello Child</div>;

describe('Layout', () => {
  it('shouldRenderHeaderGridAndChildren_whenRendered', async () => {
    (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });

    const qc = new QueryClient();
    await act(async () =>
      render(
        <RouterProvider
          router={createTestRouter(() => (
            <AuthProvider>
              <QueryClientProvider client={qc}>
                <PreferenceProvider>
                  <ThemeProvider>
                    <LayoutProvider>
                      <Layout>
                        <DummyChild />
                      </Layout>
                    </LayoutProvider>
                  </ThemeProvider>
                </PreferenceProvider>
              </QueryClientProvider>
            </AuthProvider>
          ))}
        />,
      ),
    );

    // Header
    expect(document.querySelector('.cds--header')).not.toBeNull();
    // Content body
    expect(document.querySelector('.cds--content')).not.toBeNull();
    // Grid
    expect(document.querySelector('.layout-grid')).not.toBeNull();
    // Children
    expect(screen.getByText('Hello Child')).toBeDefined();
  });
});
