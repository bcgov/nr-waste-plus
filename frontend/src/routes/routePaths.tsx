import { Group, SearchLocate } from '@carbon/icons-react';
import { Navigate, type RouteObject } from 'react-router-dom';

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

export type MenuItem = Pick<RouteDescription, 'id' | 'path' | 'icon'> & {
  children?: MenuItem[];
};

export const GLOBAL_ROLES: RouteDescription[] = [
  {
    path: '/no-role',
    id: 'No Role',
    element: <NoRolePage />,
    isSideMenu: false,
  },
];

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
    element: <Navigate to="/search" replace />,
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
    element: <Navigate to="/search" replace />,
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
    roles: [{ role: Role.BCeID, clients: [] }],
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

const filterByOnlineStatus = (route: RouteDescription, isOnline: boolean): boolean => {
  if (route.offlineOnly) return !isOnline;
  if (route.offlineReady) return true;
  return isOnline;
};

const hasAccess = (route: RouteDescription, isOnline: boolean, roles: FamRole[]): boolean => {
  if (!route.protected) return true;
  if (!filterByOnlineStatus(route, isOnline)) return false;
  if (!route.roles || route.roles.length === 0) return true;
  return route.roles.some((role) => roles.map((userRole) => userRole.role).includes(role.role));
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

export const getMenuEntries = (isOnline: boolean, roles: FamRole[]): MenuItem[] => {
  return extractMenuItems(ROUTES, isOnline, roles);
};

export const getPublicRoutes = (): RouteDescription[] => {
  return filterRoutesRecursively(
    SYSTEM_ROUTES.filter((route) => !route.protected),
    true,
    [],
  );
};

export const getProtectedRoutes = (isOnline: boolean, roles: FamRole[]): RouteDescription[] => {
  return [
    ...filterRoutesRecursively(
      ROUTES,
      isOnline,
      roles.map((role) => role.role),
    ),
    ...SYSTEM_ROUTES.filter((route) => route.id !== 'Landing').filter((route) => route.protected),
    ...GLOBAL_ROLES,
  ].map((route) => ({
    ...route,
    element: route.protected ? (
      <ProtectedRoute roles={route.roles ?? []}>{route.element}</ProtectedRoute>
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
