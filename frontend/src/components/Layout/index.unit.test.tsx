import { screen } from '@testing-library/react';
import { describe, expect, it, vi, type Mock } from 'vitest';

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
  isRouteAccessible: () => true,
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

/** Renders the Layout with mocked route/API dependencies. */
const renderLayout = async () => {
  (APIs.user.getUserPreferences as Mock).mockResolvedValue({ theme: 'g10' });

  return renderWithAppAsync(
    <LayoutProvider>
      <Layout>
        <DummyChild />
      </Layout>
    </LayoutProvider>,
  );
};

describe('Layout', () => {
  it('shouldRenderHeaderGridAndChildren_whenRendered', async () => {
    await renderLayout();

    // Header
    screen.getByRole('banner');
    // Content body
    screen.getByRole('main');
    // Grid
    screen.getByTestId('layout-grid');
    // Children
    screen.getByText('Hello Child');
  });

  it('shouldTargetSingleMainLandmarkWithSkipLinkId_whenRendered', async () => {
    await renderLayout();

    const mains = screen.getAllByRole('main');
    expect(mains).toHaveLength(1);
    expect(mains[0]?.id).toBe('main-content');
    // tabIndex=-1 keeps the landmark out of the tab order while still allowing
    // fragment navigation to move focus onto it (R-1386-5).
    expect(mains[0]?.getAttribute('tabindex')).toBe('-1');
  });

  it('shouldResolveSkipLinkHrefToMainLandmark_whenSkipLinkRendered', async () => {
    await renderLayout();

    // The header skip link's href must resolve to an element that exists (R-1386-2).
    const skipLink = document.querySelector('a[href="#main-content"]');
    expect(skipLink).not.toBeNull();

    const target = document.querySelector('#main-content');
    expect(target).not.toBeNull();
    expect(target?.tagName).toBe('MAIN');
    expect(target).toBe(screen.getByRole('main'));
  });
});
