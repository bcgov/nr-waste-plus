import { DashboardReference } from '@carbon/icons-react';
import { Navigate, type RouteObject } from 'react-router-dom';

import Layout from '@/components/Layout';
import DashboardPage from '@/pages/Dashboard';
import GlobalErrorPage from '@/pages/GlobalError';
import LandingPage from '@/pages/Landing';
import NotFoundPage from '@/pages/NotFound';
import RoleErrorPage from '@/pages/RoleError';

import ProtectedRoute from './ProtectedRoute';

export type RouteDescription = {
  id: string;
  path: string;
  element: React.ReactNode;
  icon?: React.ComponentType;
  protected?: boolean;
  isSideMenu: boolean;
  children?: RouteDescription[];
  roles?: string[];
  offlineReady?: boolean;
  offlineOnly?: boolean;
} & RouteObject;

export type MenuItem = Pick<RouteDescription, 'id' | 'path' | 'icon'> & {
  children?: MenuItem[];
};

export const SYSTEM_ROUTES: RouteDescription[] = [
  {
    path: '*',
    id: 'Not Found',
    element: <NotFoundPage />,
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
    path: '/unauthorized',
    id: 'Unauthorized',
    element: <RoleErrorPage />,
    isSideMenu: false,
  },
  {
    path: '/unauthorized',
    id: 'Unauthorized',
    element: (
      <Layout>
        <RoleErrorPage />
      </Layout>
    ),
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

export const ROUTES: RouteDescription[] = [
  {
    path: '/dashboard',
    id: 'Dashboard',
    icon: DashboardReference,
    element: (
      <Layout>
        <DashboardPage />
      </Layout>
    ),
    isSideMenu: true,
    protected: true,
  },
];

const filterByOnlineStatus = (route: RouteDescription, isOnline: boolean): boolean => {
  if (route.offlineOnly) return !isOnline;
  if (route.offlineReady) return true;
  return isOnline;
};

const hasAccess = (route: RouteDescription, isOnline: boolean, roles: string[]): boolean => {
  if (!route.protected) return true;
  if (!filterByOnlineStatus(route, isOnline)) return false;
  if (!route.roles || route.roles.length === 0) return true;
  return route.roles.some((role) => roles.includes(role));
};

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

const extractMenuItems = (
  routes: RouteDescription[],
  isOnline: boolean,
  roles: string[],
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

export const getMenuEntries = (isOnline: boolean, roles: string[]): MenuItem[] => {
  return extractMenuItems(ROUTES, isOnline, roles);
};

export const getPublicRoutes = (): RouteDescription[] => {
  return filterRoutesRecursively(
    SYSTEM_ROUTES.filter((route) => !route.protected),
    true,
    [],
  );
};

export const getProtectedRoutes = (isOnline: boolean, roles: string[]): RouteDescription[] => {
  return [
    ...filterRoutesRecursively(ROUTES, isOnline, roles),
    ...SYSTEM_ROUTES.filter((route) => route.id !== 'Landing').filter((route) => route.protected),
  ].map((route) => ({
    ...route,
    element:
      route.roles && route.protected ? (
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
