import { screen } from '@testing-library/react';
import { describe, it, vi, type Mock } from 'vitest';

import Layout from './index';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import { LayoutProvider } from '@/context/layout/LayoutProvider';
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

    await renderWithAppAsync(
      <LayoutProvider>
        <Layout>
          <DummyChild />
        </Layout>
      </LayoutProvider>,
    );

    // Header
    screen.getByRole('banner');
    // Content body
    screen.getByRole('main');
    // Grid
    screen.getByTestId('layout-grid');
    // Children
    screen.getByText('Hello Child');
  });
});
