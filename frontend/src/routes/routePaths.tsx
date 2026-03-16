import { Group, SearchLocate } from '@carbon/icons-react';
import { Navigate, type RouteObject } from 'react-router-dom';

import DashboardRedirect from './DashboardRedirect';
import ProtectedRoute from './ProtectedRoute';

import Layout from '@/components/Layout';
import { Role, type FamRole } from '@/context/auth/types';
import GlobalErrorPage from '@/pages/GlobalError';
import LandingPage from '@/pages/Landing';
import MyClientListPage from '@/pages/MyClientList';
import NoRolePage from '@/pages/NoRole';
import NotFoundPage from '@/pages/NotFound';
import RoleErrorPage from '@/pages/RoleError';
import WasteSearchPage from '@/pages/WasteSearch';

/**
 * Extends a React Router route with metadata used for menus and access control.
 */
export type RouteDescription = {
  id: string;
  path: string;
  element: React.ReactNode;
  icon?: React.ComponentType;
  protected?: boolean;
  isSideMenu: boolean;
  children?: RouteDescription[];
  roles?: FamRole[];
  offlineReady?: boolean;
  offlineOnly?: boolean;
} & RouteObject;

/**
 * Minimal menu metadata derived from the route registry.
 */
export type MenuItem = Pick<RouteDescription, 'id' | 'path' | 'icon'> & {
  children?: MenuItem[];
};

/**
 * Global routes that remain available regardless of online status or menu context.
 */
export const GLOBAL_ROUTES: RouteDescription[] = [
  {
    path: '/no-role',
    id: 'No Role',
    element: <NoRolePage />,
    isSideMenu: false,
  },
];

/**
 * System routes used for landing, redirects, and application-wide error handling.
 */
export const SYSTEM_ROUTES: RouteDescription[] = [
  {
    path: '*',
    id: 'Not Found, Redirect',
    element: <Navigate to="/" replace />,
    isSideMenu: false,
  },
  {
    path: '*',
    id: 'Not Found',
    element: (
      <Layout>
        <NotFoundPage />
      </Layout>
    ),
    isSideMenu: false,
    protected: true,
  },
  {
    path: '/dashboard',
    id: 'Dashboard',
    element: <DashboardRedirect />,
    isSideMenu: false,
  },
  {
    path: '/unauthorized',
    id: 'Unauthorized',
    element: <RoleErrorPage />,
    isSideMenu: false,
  },
  {
    path: '/unauthorized',
    id: 'Unauthorized',
    element: <RoleErrorPage />,
    isSideMenu: false,
    protected: true,
  },
  {
    path: '/',
    id: 'Landing',
    element: <LandingPage />,
    isSideMenu: false,
  },
  // Redirect user to dashboard if they are already logged in
  {
    path: '/',
    id: 'RedirectWhileLoggedIn',
    element: <Navigate to="/dashboard" replace />,
    isSideMenu: false,
    protected: true,
  },
];

/**
 * Primary application routes available after authentication.
 */
export const ROUTES: RouteDescription[] = [
  {
    path: '/dashboard',
    id: 'Dashboard',
    element: <DashboardRedirect />,
    isSideMenu: false,
    protected: true,
  },
  {
    path: '/clients',
    id: 'My clients',
    icon: Group,
    element: (
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
    element: (
      <Layout>
        <WasteSearchPage />
      </Layout>
    ),
    isSideMenu: true,
    protected: true,
  },
];

/**
 * Applies online and offline visibility rules to a route definition.
 *
 * @param route The route being evaluated.
 * @param isOnline Whether the application is currently online.
 * @returns True when the route should be available in the current connectivity state.
 */
const filterByOnlineStatus = (route: RouteDescription, isOnline: boolean): boolean => {
  if (route.offlineOnly) return !isOnline;
  if (route.offlineReady) return true;
  return isOnline;
};

/**
 * Determines whether a user can access a route given connectivity and role constraints.
 *
 * @param route The route being evaluated.
 * @param isOnline Whether the application is currently online.
 * @param roles The authenticated user's roles.
 * @returns True when the route is accessible.
 */
const hasAccess = (route: RouteDescription, isOnline: boolean, roles: FamRole[]): boolean => {
  if (!route.protected) return true;
  if (!filterByOnlineStatus(route, isOnline)) return false;
  if (!route.roles || route.roles.length === 0) return true;
  return route.roles.some((role) => roles.map((userRole) => userRole.role).includes(role.role));
};

/**
 * Filters a route tree by connectivity and preserves child route structure.
 *
 * @param routes The route definitions to filter.
 * @param isOnline Whether the application is currently online.
 * @param roles The user's role names.
 * @returns A filtered route tree with children pruned recursively.
 */
const filterRoutesRecursively = (
  routes: RouteDescription[],
  isOnline: boolean,
  roles: string[],
): RouteDescription[] => {
  return routes
    .filter((route) => filterByOnlineStatus(route, isOnline))
    .map((route) => {
      const filteredChildren = route.children
        ? filterRoutesRecursively(route.children, isOnline, roles)
        : undefined;

      return {
        ...route,
        ...(filteredChildren ? { children: filteredChildren } : {}),
      } as RouteDescription;
    });
};

/**
 * Extracts side navigation items from the route registry for the current user state.
 *
 * @param routes The route definitions to inspect.
 * @param isOnline Whether the application is currently online.
 * @param roles The authenticated user's roles.
 * @returns The menu items that should be shown in the side navigation.
 */
const extractMenuItems = (
  routes: RouteDescription[],
  isOnline: boolean,
  roles: FamRole[],
): MenuItem[] => {
  return routes
    .filter((route) => route.isSideMenu && filterByOnlineStatus(route, isOnline))
    .filter((route) => hasAccess(route, isOnline, roles))
    .map((route) => ({
      id: route.id,
      path: route.path,
      icon: route.icon,
      children: route.children ? extractMenuItems(route.children, isOnline, roles) : undefined,
    }));
};

/**
 * Builds the side navigation entries for the current connectivity and role state.
 *
 * @param isOnline Whether the application is currently online.
 * @param roles The authenticated user's roles.
 * @returns The menu items to render in the side navigation.
 */
export const getMenuEntries = (isOnline: boolean, roles: FamRole[]): MenuItem[] => {
  return extractMenuItems(ROUTES, isOnline, roles);
};

/**
 * Returns the routes available before a user is authenticated.
 *
 * @returns Public route definitions with system-only protected entries removed.
 */
export const getPublicRoutes = (): RouteDescription[] => {
  return filterRoutesRecursively(
    SYSTEM_ROUTES.filter((route) => !route.protected),
    true,
    [],
  );
};

/**
 * Returns the route tree available to an authenticated user.
 *
 * @param isOnline Whether the application is currently online.
 * @param roles The authenticated user's roles.
 * @returns Protected routes wrapped with access control and route-level error handling.
 */
export const getProtectedRoutes = (isOnline: boolean, roles: FamRole[]): RouteDescription[] => {
  return [
    ...filterRoutesRecursively(
      ROUTES,
      isOnline,
      roles.map((role) => role.role),
    ),
    ...SYSTEM_ROUTES.filter((route) => route.id !== 'Landing').filter((route) => route.protected),
    ...GLOBAL_ROUTES,
  ].map((route) => ({
    ...route,
    element: route.protected ? (
      <ProtectedRoute roles={route.roles}>{route.element}</ProtectedRoute>
    ) : (
      route.element
    ),
    errorElement: (
      <Layout>
        <GlobalErrorPage />
      </Layout>
    ),
  }));
};
