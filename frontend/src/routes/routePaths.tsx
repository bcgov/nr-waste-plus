import { Group, SearchLocate } from '@carbon/icons-react';
import { type ComponentType } from 'react';
import { type RouteLoaderFn } from '@tanstack/react-router';

import Layout from '@/components/Layout';
import { Role, type FamRole } from '@/context/auth/types';
import LandingPage from '@/pages/Landing';
import MyClientListPage from '@/pages/MyClientList';
import NoRolePage from '@/pages/NoRole';
import ReportingUnitDetailsPage from '@/pages/ReportingUnitDetails';
import { reportingUnitLoader } from '@/pages/ReportingUnitDetails/loader';
import RoleErrorPage from '@/pages/RoleError';
import WasteSearchPage from '@/pages/WasteSearch';
import { withPersistentRedirect } from '@/routes/guards/withPersistentRedirect';
import { withPublicOnly } from '@/routes/guards/withPublicOnly';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A HOC that wraps a route component with additional behaviour (e.g. auth, connectivity). */
export type RouteGuard = <P extends object>(Component: ComponentType<P>) => ComponentType<P>;

/**
 * Describes a single application route and all of its access/navigation metadata.
 *
 * Used by {@link applyGuards} in `routeTree.tsx` to wrap the `component` with
 * the appropriate HOC guards, and by {@link getMenuEntries} to build the left-
 * panel navigation.
 */
export type RouteDescription = {
  path: string;
  /** Unique display label and side-nav identifier for the route. */
  id: string;
  component: ComponentType;
  /** Optional data loader function invoked by the router before navigation. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader?: (args: any) => Promise<any>;
  /** Carbon icon component rendered next to the nav label when `isSideMenu` is true. */
  icon?: ComponentType;
  /** When `true`, the route appears in the left-panel side navigation. */
  isSideMenu: boolean;
  /** Wraps component with withProtected (+ optional role check). */
  protected?: boolean;
  roles?: readonly FamRole[];
  /** Wraps component with withOfflineSupport. */
  offlineReady?: boolean;
  offlineOnly?: boolean;
  /**
   * Additional HOC guards applied outermost — run before protected/offline checks.
   * Stack order in array: [outermost, ..., innermost before protected].
   */
  guards?: RouteGuard[];
  /**
   * Optional TanStack Router loader function executed before the route component renders.
   * Resolved data is available via `useLoaderData()` inside the component.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader?: RouteLoaderFn<any>;
};

export type MenuItem = Pick<RouteDescription, 'id' | 'path' | 'icon'> & {
  children?: MenuItem[];
};

/**
 * Feature routes that drive the left-panel navigation.
 *
 * Each entry is registered as a TanStack Router route in `routeTree.tsx` and
 * wrapped with its declared HOC guards (e.g. {@link withProtected}).
 * Only entries where `isSideMenu: true` appear in the side-nav.
 */
export const ROUTES: RouteDescription[] = [
  {
    path: '/clients',
    id: 'My clients',
    icon: Group,
    component: () => (
      <Layout>
        <MyClientListPage />
      </Layout>
    ),
    isSideMenu: true,
    protected: true,
    roles: [
      { role: Role.VIEWER, clients: [] },
      { role: Role.SUBMITTER, clients: [] },
    ],
  },
  {
    path: '/search',
    id: 'Waste search',
    icon: SearchLocate,
    component: () => (
      <Layout>
        <WasteSearchPage />
      </Layout>
    ),
    isSideMenu: true,
    protected: true,
  },
  {
    path: '/reporting-units/$ruId',
    id: 'Reporting Unit Details',
    loader: reportingUnitLoader,
    component: () => (
      <Layout>
        <ReportingUnitDetailsPage />
      </Layout>
    ),
    isSideMenu: false,
    protected: true,
  },
];

/**
 * Infrastructure routes not visible in the navigation menu.
 *
 * Includes the landing / login entry point, the post-OAuth `/dashboard` redirect
 * handler, and error pages such as `/no-role` and `/unauthorized`.
 */
export const SYSTEM_ROUTES: RouteDescription[] = [
  {
    path: '/',
    id: 'Landing',
    component: LandingPage,
    isSideMenu: false,
    guards: [withPublicOnly],
  },
  {
    path: '/dashboard',
    id: 'Dashboard',
    component: () => null,
    isSideMenu: false,
    guards: [withPersistentRedirect],
  },
  {
    path: '/no-role',
    id: 'No Role',
    component: NoRolePage,
    isSideMenu: false,
  },
  {
    path: '/unauthorized',
    id: 'Unauthorized',
    component: RoleErrorPage,
    isSideMenu: false,
  },
];

/**
 * Returns the side-nav {@link MenuItem} entries visible to the current user.
 *
 * Filters {@link ROUTES} by:
 * 1. `isSideMenu: true` — only navigation-visible routes
 * 2. Connectivity — when **online**, excludes `offlineOnly` routes; when **offline**,
 *    excludes routes that are neither `offlineReady` nor `offlineOnly` (online-only routes)
 * 3. Role match — excludes routes whose `roles` list does not intersect `roles`
 *
 * @param isOnline - Whether the browser currently has network connectivity.
 * @param roles - The authenticated user's FAM role assignments.
 * @returns Filtered and projected array of `{ id, path, icon }` menu items.
 */
export const getMenuEntries = (isOnline: boolean, roles: FamRole[]): MenuItem[] =>
  ROUTES.filter((r) => r.isSideMenu)
    .filter((r) => (isOnline ? !r.offlineOnly : !!(r.offlineReady || r.offlineOnly)))
    .filter(
      (r) =>
        !r.roles?.length || r.roles.some((role) => roles.map((u) => u.role).includes(role.role)),
    )
    .map(({ id, path, icon }) => ({ id, path, icon }));
