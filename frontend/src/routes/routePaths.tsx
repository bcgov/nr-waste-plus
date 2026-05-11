import { Group, SearchLocate } from '@carbon/icons-react';
import { type ComponentType } from 'react';

import Layout from '@/components/Layout';
import { Role, type FamRole } from '@/context/auth/types';
import LandingPage from '@/pages/Landing';
import MyClientListPage from '@/pages/MyClientList';
import NoRolePage from '@/pages/NoRole';
import RoleErrorPage from '@/pages/RoleError';
import WasteSearchPage from '@/pages/WasteSearch';
import { withPersistentRedirect } from '@/routes/guards/withPersistentRedirect';
import { withPublicOnly } from '@/routes/guards/withPublicOnly';

// ─── Types ────────────────────────────────────────────────────────────────────

/** A HOC that wraps a route component with additional behaviour. */
export type RouteGuard = <P extends object>(Component: ComponentType<P>) => ComponentType<P>;

export type RouteDescription = {
  path: string;
  id: string;
  component: ComponentType;
  icon?: ComponentType;
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
};

export type MenuItem = Pick<RouteDescription, 'id' | 'path' | 'icon'> & {
  children?: MenuItem[];
};

// ─── Feature routes — drive the left-panel navigation ────────────────────────

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
];

// ─── System routes — infrastructure pages not visible in the nav menu ─────────

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

/** Returns side-nav entries visible to the current user and connectivity state. */
export const getMenuEntries = (isOnline: boolean, roles: FamRole[]): MenuItem[] =>
  ROUTES.filter((r) => r.isSideMenu)
    .filter((r) => !r.offlineOnly || !isOnline)
    .filter(
      (r) =>
        !r.roles?.length || r.roles.some((role) => roles.map((u) => u.role).includes(role.role)),
    )
    .map(({ id, path, icon }) => ({ id, path, icon }));

