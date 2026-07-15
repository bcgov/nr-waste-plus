import { DocumentAdd, Group, SearchLocate } from '@carbon/icons-react';
import { type RouteLoaderFn } from '@tanstack/react-router';
import { type ComponentType } from 'react';

import Layout from '@/components/Layout';
import { Role, type FamRole } from '@/context/auth/types';
import { featureFlags, type FeatureFlags } from '@/env';
import ConfigurationDistrictVolumeListPage from '@/pages/ConfigurationDistrictVolumeList';
import ConfigurationPage from '@/pages/ConfigurationPage';
import DistrictVolumeTableDetailPage from '@/pages/DistrictVolumeTableDetail';
import DistrictVolumeTableUploadPage from '@/pages/DistrictVolumeTableUpload';
import LandingPage from '@/pages/Landing';
import MyClientListPage from '@/pages/MyClientList';
import NoRolePage from '@/pages/NoRole';
import ReportingUnitCreatePage from '@/pages/ReportingUnitCreate';
import ReportingUnitDetailsPage from '@/pages/ReportingUnitDetails';
import { reportingUnitLoader } from '@/pages/ReportingUnitDetails/loader';
import RoleErrorPage from '@/pages/RoleError';
import SpeciesCompositionDetailPage from '@/pages/SpeciesCompositionDetail';
import SpeciesCompositionListPage from '@/pages/SpeciesCompositionList';
import SpeciesCompositionUploadPage from '@/pages/SpeciesCompositionUpload';
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
  /** URL path registered in the TanStack Router route tree (e.g. `'/search'`, `'/reporting-units/$ruId'`). */
  path: string;
  /** Unique display label and side-nav identifier for the route. */
  id: string;
  /** The React component rendered when the route is active. Typically wrapped in `<Layout>`. */
  component: ComponentType;
  /**
   * Optional TanStack Router loader function executed before the route component renders.
   * Resolved data is available via `useLoaderData()` inside the component.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  loader?: RouteLoaderFn<any>;
  /** Carbon icon component rendered next to the nav label when `isSideMenu` is true. */
  icon?: ComponentType;
  /** When `true`, the route appears in the left-panel side navigation. */
  isSideMenu: boolean;
  /** Wraps component with withProtected (+ optional role check). */
  protected?: boolean;
  /** FAM role assignments required to access this route. Empty or absent means any authenticated user can access it. */
  roles?: readonly FamRole[];
  /** Wraps component with withOfflineSupport. */
  offlineReady?: boolean;
  /** When `true`, this route is exclusively shown in offline mode; hidden when online. */
  offlineOnly?: boolean;
  /**
   * Additional HOC guards applied outermost — run before protected/offline checks.
   * Stack order in array: [outermost, ..., innermost before protected].
   */
  guards?: RouteGuard[];
  /**
   * When set, wraps the component with {@link withFeatureFlag} using the
   * current value of this feature flag. Throws `notFound()` when disabled.
   */
  featureFlag?: keyof FeatureFlags;
};

/** A leaf navigation item derived from a {@link RouteDescription} for rendering in the side-nav. */
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
  {
    path: '/reporting-units/create',
    id: 'Create reporting unit',
    icon: DocumentAdd,
    component: () => (
      <Layout>
        <ReportingUnitCreatePage />
      </Layout>
    ),
    isSideMenu: true,
    protected: true,
    featureFlag: 'reporting-unit-create-enabled',
  },
  {
    path: '/configuration',
    id: 'Configuration',
    component: () => (
      <Layout>
        <ConfigurationPage />
      </Layout>
    ),
    isSideMenu: false,
    protected: true,
    roles: [{ role: Role.ADMIN, clients: [] }],
    featureFlag: 'configuration-enabled',
  },
  {
    path: '/configuration/district-volume-tables',
    id: 'District Volume Tables',
    component: () => (
      <Layout>
        <ConfigurationDistrictVolumeListPage />
      </Layout>
    ),
    isSideMenu: false,
    protected: true,
    roles: [{ role: Role.ADMIN, clients: [] }],
    featureFlag: 'configuration-enabled',
  },
  {
    path: '/configuration/district-volume-tables/$id',
    id: 'District Volume Table Detail',
    component: () => (
      <Layout>
        <DistrictVolumeTableDetailPage />
      </Layout>
    ),
    isSideMenu: false,
    protected: true,
    roles: [{ role: Role.ADMIN, clients: [] }],
    featureFlag: 'configuration-enabled',
  },
  {
    path: '/configuration/district-volume-tables/upload',
    id: 'Upload District Volume Table',
    component: () => (
      <Layout>
        <DistrictVolumeTableUploadPage />
      </Layout>
    ),
    isSideMenu: false,
    protected: true,
    roles: [{ role: Role.ADMIN, clients: [] }],
    featureFlag: 'configuration-enabled',
  },
  {
    path: '/configuration/species-composition',
    id: 'Species Composition',
    component: () => (
      <Layout>
        <SpeciesCompositionListPage />
      </Layout>
    ),
    isSideMenu: false,
    protected: true,
    roles: [{ role: Role.ADMIN, clients: [] }],
    featureFlag: 'configuration-enabled',
  },
  {
    path: '/configuration/species-composition/upload',
    id: 'Upload Species Composition',
    component: () => (
      <Layout>
        <SpeciesCompositionUploadPage />
      </Layout>
    ),
    isSideMenu: false,
    protected: true,
    roles: [{ role: Role.ADMIN, clients: [] }],
    featureFlag: 'configuration-enabled',
  },
  {
    path: '/configuration/species-composition/$id',
    id: 'Species Composition Detail',
    component: () => (
      <Layout>
        <SpeciesCompositionDetailPage />
      </Layout>
    ),
    isSideMenu: false,
    protected: true,
    roles: [{ role: Role.ADMIN, clients: [] }],
    featureFlag: 'configuration-enabled',
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
 * Checks whether a user with the given roles can access a route that
 * requires specific roles and/or a feature flag.
 *
 * @param userRoles - The authenticated user's FAM role assignments.
 * @param requiredRoles - Optional role requirements from the route. Empty/undefined means any role.
 * @param featureFlag - Optional feature flag key. Undefined means no flag gating.
 * @returns `true` when the user satisfies both role and feature-flag requirements.
 */
export const isRouteAccessible = (
  userRoles: FamRole[],
  requiredRoles?: readonly FamRole[],
  featureFlag?: keyof FeatureFlags,
): boolean => {
  const hasRole =
    !requiredRoles?.length || requiredRoles.some((r) => userRoles.some((u) => u.role === r.role));
  const flagEnabled = !featureFlag || !!featureFlags[featureFlag];
  return hasRole && flagEnabled;
};

/**
 * Returns the side-nav {@link MenuItem} entries visible to the current user.
 *
 * Filters {@link ROUTES} by:
 * 1. `isSideMenu: true` — only navigation-visible routes
 * 2. Connectivity — when **online**, excludes `offlineOnly` routes; when **offline**,
 *    excludes routes that are neither `offlineReady` nor `offlineOnly` (online-only routes)
 * 3. Role match — excludes routes whose `roles` list does not intersect `roles`
 * 4. Feature flags — excludes routes that depend on disabled feature flags
 *
 * @param isOnline - Whether the browser currently has network connectivity.
 * @param roles - The authenticated user's FAM role assignments.
 * @returns Filtered and projected array of `{ id, path, icon }` menu items.
 */
export const getMenuEntries = (isOnline: boolean, roles: FamRole[]): MenuItem[] =>
  ROUTES.filter((r) => r.isSideMenu)
    .filter((r) => (isOnline ? !r.offlineOnly : !!(r.offlineReady || r.offlineOnly)))
    .filter((r) => isRouteAccessible(roles, r.roles, r.featureFlag))
    .map(({ id, path, icon }) => ({ id, path, icon }));
