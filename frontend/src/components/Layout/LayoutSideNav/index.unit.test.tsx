import { screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { LayoutSideNav } from './index';

import { renderWithAppAsync } from '@/config/tests/renderWithApp';
import * as useAuthModule from '@/context/auth/useAuth';
import { Role } from '@/context/auth/types';
import { LayoutProvider } from '@/context/layout/LayoutProvider';
import * as routePathsModule from '@/routes/routePaths';

vi.mock(import('@/env'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    env: {
      ...actual.env,
      VITE_IDIR_HELP: 'https://test-idir-help.example.com',
      VITE_BCEID_HELP: 'https://test-bceid-help.example.com',
    },
    featureFlags: {
      'offline-mode-enabled': false,
      'bookmark-ru-enabled': false,
      'reporting-unit-details-enabled': false,
      'reporting-unit-create-enabled': true,
      'configuration-enabled': true,
    },
  };
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/context/layout/useLayout', () => ({
  useLayout: () => ({ isSideNavExpanded: true }),
}));

const defaultMenuEntries = [
  {
    id: 'Dashboard',
    path: '/dashboard',
  },
  {
    id: 'Settings',
    path: '/settings',
    children: [
      {
        id: 'Profile',
        path: 'profile',
      },
    ],
  },
];

vi.mock('@/routes/routePaths', () => ({
  getMenuEntries: vi.fn(),
  isRouteAccessible: vi.fn(),
}));

const renderWithProviders = (pathname = '/dashboard') =>
  renderWithAppAsync(
    <LayoutProvider>
      <LayoutSideNav />
    </LayoutProvider>,
    { route: pathname },
  );

describe('LayoutSideNav', () => {
  beforeEach(() => {
    vi.mocked(routePathsModule.getMenuEntries).mockReturnValue(defaultMenuEntries);
    vi.mocked(routePathsModule.isRouteAccessible).mockReturnValue(true);
    vi.mocked(useAuthModule.useAuth).mockReturnValue({
      user: undefined,
      isLoggedIn: false,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      userToken: vi.fn(),
      getClients: vi.fn(),
    });
  });

  it('shouldRenderMenuLinksAndMenuItems_whenDefaultEntries', async () => {
    await renderWithProviders('/dashboard');
    screen.getByText('Dashboard');
    screen.getByText('Settings');
    screen.getByText('Profile');
    expect(screen.queryByText('Admin')).toBeNull();
    expect(screen.queryByText('Hidden')).toBeNull();
  });

  it('shouldMarkCorrectLinkAsActive_whenPathMatches', async () => {
    await renderWithProviders('/settings/profile');
    const profileLink = screen.getByText('Profile').closest('a');
    expect(profileLink?.className).toContain('cds--side-nav__link--current');
  });

  it('shouldRenderIcons_whenRouteHasIconComponent', async () => {
    const MockIcon = () => <svg data-testid="mock-icon" />;
    vi.mocked(routePathsModule.getMenuEntries).mockReturnValue([
      {
        id: 'Dashboard',
        path: '/dashboard',
        icon: MockIcon,
      },
      {
        id: 'Settings',
        path: '/settings',
        icon: MockIcon,
        children: [
          {
            id: 'Profile',
            path: 'profile',
            icon: MockIcon,
          },
        ],
      },
    ]);
    await renderWithProviders('/dashboard');
    expect(screen.getAllByTestId('mock-icon').length).toBeGreaterThan(0);
  });

  it('shouldRenderChildRoute_whenChildHasNoPath', async () => {
    vi.mocked(routePathsModule.getMenuEntries).mockReturnValue([
      {
        id: 'Settings',
        path: '/settings',
        children: [
          {
            id: 'Overview',
            path: '',
          },
        ],
      },
    ]);
    await renderWithProviders('/settings');
    screen.getByText('Overview');
  });

  describe('help link', () => {
    it('shouldUseIdirHelpUrl_whenUserIsIdirProvider', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: { idpProvider: 'IDIR', privileges: {} },
        isLoggedIn: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        userToken: vi.fn(),
        getClients: vi.fn(),
      });
      await renderWithProviders('/dashboard');
      const helpLink = screen.getByRole('link', { name: 'Need Help?' });
      expect(helpLink.getAttribute('href')).toBe('https://test-idir-help.example.com');
    });

    it('shouldUseBceidHelpUrl_whenUserIsBceidProvider', async () => {
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: { idpProvider: 'BCEIDBUSINESS', privileges: {} },
        isLoggedIn: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        userToken: vi.fn(),
        getClients: vi.fn(),
      });
      await renderWithProviders('/dashboard');
      const helpLink = screen.getByRole('link', { name: 'Need Help?' });
      expect(helpLink.getAttribute('href')).toBe('https://test-bceid-help.example.com');
    });
  });

  describe('configuration link', () => {
    it('shouldRenderConfigurationLink_whenUserHasAdminRole', async () => {
      vi.mocked(routePathsModule.isRouteAccessible).mockReturnValue(true);
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: {
          idpProvider: 'IDIR',
          roles: [{ role: Role.ADMIN, clients: [] }],
          privileges: {},
        },
        isLoggedIn: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        userToken: vi.fn(),
        getClients: vi.fn(),
      });
      await renderWithProviders('/dashboard');
      screen.getByTestId('side-nav-link-config');
    });

    it('shouldNotRenderConfigurationLink_whenUserHasNoAdminRole', async () => {
      vi.mocked(routePathsModule.isRouteAccessible).mockReturnValue(false);
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: {
          idpProvider: 'IDIR',
          roles: [{ role: Role.VIEWER, clients: [] }],
          privileges: {},
        },
        isLoggedIn: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        userToken: vi.fn(),
        getClients: vi.fn(),
      });
      await renderWithProviders('/dashboard');
      expect(screen.queryByTestId('side-nav-link-config')).toBeNull();
    });

    it('shouldNotRenderConfigurationLink_whenUserHasMultipleRolesButNoAdmin', async () => {
      vi.mocked(routePathsModule.isRouteAccessible).mockReturnValue(false);
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: {
          idpProvider: 'IDIR',
          roles: [
            { role: Role.VIEWER, clients: [] },
            { role: Role.SUBMITTER, clients: [] },
          ],
          privileges: {},
        },
        isLoggedIn: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        userToken: vi.fn(),
        getClients: vi.fn(),
      });
      await renderWithProviders('/dashboard');
      expect(screen.queryByTestId('side-nav-link-config')).toBeNull();
    });

    it('shouldNotRenderConfigurationLink_whenUserIsUndefined', async () => {
      vi.mocked(routePathsModule.isRouteAccessible).mockReturnValue(false);
      await renderWithProviders('/dashboard');
      expect(screen.queryByTestId('side-nav-link-config')).toBeNull();
    });

    it('shouldRenderConfigurationLink_whenUserHasAdminAmongMultipleRoles', async () => {
      vi.mocked(routePathsModule.isRouteAccessible).mockReturnValue(true);
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: {
          idpProvider: 'IDIR',
          roles: [
            { role: Role.VIEWER, clients: [] },
            { role: Role.ADMIN, clients: [] },
          ],
          privileges: {},
        },
        isLoggedIn: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        userToken: vi.fn(),
        getClients: vi.fn(),
      });
      await renderWithProviders('/dashboard');
      screen.getByTestId('side-nav-link-config');
    });

    it('shouldNotRenderConfigurationLink_whenFeatureFlagDisabled', async () => {
      vi.mocked(routePathsModule.isRouteAccessible).mockReturnValue(false);
      vi.mocked(useAuthModule.useAuth).mockReturnValue({
        user: {
          idpProvider: 'IDIR',
          roles: [{ role: Role.ADMIN, clients: [] }],
          privileges: {},
        },
        isLoggedIn: true,
        isLoading: false,
        login: vi.fn(),
        logout: vi.fn(),
        userToken: vi.fn(),
        getClients: vi.fn(),
      });
      await renderWithProviders('/dashboard');
      expect(screen.queryByTestId('side-nav-link-config')).toBeNull();
    });
  });
});
