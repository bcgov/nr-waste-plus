import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import * as routePaths from './routePaths';

import { Role } from '@/context/auth/types';

// ── Mocks for env ──────────────────────────────────────────────────────────────
vi.mock('@/env', async () => {
  const actual = await vi.importActual('@/env');
  return {
    ...actual,
    featureFlags: {
      'offline-mode-enabled': false,
      'bookmark-ru-enabled': false,
      'reporting-unit-details-enabled': false,
      'reporting-unit-create-enabled': true, // enabled by default in tests
      'configuration-enabled': false,
    },
  };
});

// ── Mocks for route component rendering ───────────────────────────────────────
vi.mock('@/components/Layout', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="layout">{children}</div>
  ),
}));

vi.mock('@/pages/MyClientList', () => ({
  default: () => <div data-testid="my-client-list" />,
}));

vi.mock('@/pages/WasteSearch', () => ({
  default: () => <div data-testid="waste-search" />,
}));

vi.mock('@/pages/Landing', () => ({
  default: () => <div data-testid="landing-page" />,
}));

vi.mock('@/pages/NoRole', () => ({
  default: () => <div data-testid="no-role-page" />,
}));

vi.mock('@/pages/RoleError', () => ({
  default: () => <div data-testid="role-error-page" />,
}));

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('routePaths', () => {
  describe('getMenuEntries', () => {
    it('shouldReturnArray_whenCalled', () => {
      expect(Array.isArray(routePaths.getMenuEntries(true, []))).toBe(true);
    });

    it('shouldIncludeClientsEntry_whenUserHasViewerRole', () => {
      const entries = routePaths.getMenuEntries(true, [{ role: Role.VIEWER, clients: ['100'] }]);
      expect(entries.some((e) => e.id === 'My clients')).toBe(true);
    });

    it('shouldIncludeClientsEntry_whenUserHasSubmitterRole', () => {
      const entries = routePaths.getMenuEntries(true, [{ role: Role.SUBMITTER, clients: ['100'] }]);
      expect(entries.some((e) => e.id === 'My clients')).toBe(true);
    });

    it('shouldExcludeClientsEntry_whenUserHasDistrictAreaOrAdminRole', () => {
      for (const role of [Role.DISTRICT, Role.AREA, Role.ADMIN]) {
        const entries = routePaths.getMenuEntries(true, [{ role, clients: [] }]);
        expect(entries.some((e) => e.id === 'My clients')).toBe(false);
      }
    });

    it('shouldExcludeOnlineOnlyRoutes_whenOffline', () => {
      const entries = routePaths.getMenuEntries(false, [{ role: Role.VIEWER, clients: ['100'] }]);
      expect(entries).toHaveLength(0);
    });

    it('shouldIncludeAllSideMenuRoutes_whenOnline', () => {
      const onlineEntries = routePaths.getMenuEntries(true, [
        { role: Role.VIEWER, clients: ['100'] },
      ]);
      const offlineEntries = routePaths.getMenuEntries(false, [
        { role: Role.VIEWER, clients: ['100'] },
      ]);
      expect(onlineEntries.length).toBeGreaterThan(offlineEntries.length);
    });

    it('shouldIncludeWasteSearch_whenUserHasNoSpecificRoles', () => {
      const entries = routePaths.getMenuEntries(true, []);
      expect(entries.some((e) => e.id === 'Waste search')).toBe(true);
    });

    it('shouldReturnMenuItems_withIdPathAndIcon', () => {
      const entries = routePaths.getMenuEntries(true, [{ role: Role.VIEWER, clients: ['100'] }]);
      entries.forEach((e) => {
        expect(e).toHaveProperty('id');
        expect(e).toHaveProperty('path');
      });
    });

    it('shouldExcludeFeatureFlaggedRoutes_whenFlagIsDisabled', () => {
      // Test verifies that routes with disabled feature flags are excluded.
      // "Configuration" has featureFlag: 'configuration-enabled' which is mocked as false
      const entries = routePaths.getMenuEntries(true, [{ role: Role.ADMIN, clients: [] }]);

      // "Configuration" should be excluded because its feature flag is false in the mock
      expect(entries.some((e) => e.id === 'Configuration')).toBe(false);
    });

    it('shouldIncludeCreateReportingUnit_whenFeatureFlagIsEnabled', () => {
      const entries = routePaths.getMenuEntries(true, [{ role: Role.VIEWER, clients: ['100'] }]);

      // "Create reporting unit" should be included when flag is enabled (default in mock)
      expect(entries.some((e) => e.id === 'Create reporting unit')).toBe(true);
    });

    it('shouldIncludeRoutesWithoutFeatureFlags_always', () => {
      // Test verifies that routes without featureFlag property are always included
      const entries = routePaths.getMenuEntries(true, [{ role: Role.VIEWER, clients: ['100'] }]);

      // "My clients" has no featureFlag and should always be present
      expect(entries.some((e) => e.id === 'My clients')).toBe(true);
      // "Waste search" has no featureFlag and should always be present
      expect(entries.some((e) => e.id === 'Waste search')).toBe(true);
    });
  });

  describe('ROUTES', () => {
    it('shouldDefineClientsAndSearchRoutes', () => {
      expect(routePaths.ROUTES.some((r) => r.path === '/clients')).toBe(true);
      expect(routePaths.ROUTES.some((r) => r.path === '/search')).toBe(true);
    });

    it('shouldMarkAllRoutesAsProtected', () => {
      routePaths.ROUTES.forEach((r) => {
        expect(r.protected).toBe(true);
      });
    });

    it('shouldRenderClientsRouteComponent_withoutThrowing', () => {
      const clientsRoute = routePaths.ROUTES.find((r) => r.path === '/clients')!;
      const Comp = clientsRoute.component;
      const { container } = render(<Comp />);
      expect(container).toBeDefined();
    });

    it('shouldRenderSearchRouteComponent_withoutThrowing', () => {
      const searchRoute = routePaths.ROUTES.find((r) => r.path === '/search')!;
      const Comp = searchRoute.component;
      const { container } = render(<Comp />);
      expect(container).toBeDefined();
    });
  });

  describe('SYSTEM_ROUTES', () => {
    it('shouldDefineLandingDashboardNoRoleAndUnauthorizedPaths', () => {
      const paths = routePaths.SYSTEM_ROUTES.map((r) => r.path);
      expect(paths).toContain('/');
      expect(paths).toContain('/dashboard');
      expect(paths).toContain('/no-role');
      expect(paths).toContain('/unauthorized');
    });

    it('shouldRenderDashboardRouteComponent_returnNull', () => {
      const dashRoute = routePaths.SYSTEM_ROUTES.find((r) => r.path === '/dashboard')!;
      const DashComp = dashRoute.component as () => null;
      const result = DashComp();
      expect(result).toBeNull();
    });

    it('shouldNotMarkSystemRoutesAsSideMenu', () => {
      routePaths.SYSTEM_ROUTES.forEach((r) => {
        expect(r.isSideMenu).toBe(false);
      });
    });
  });
});
