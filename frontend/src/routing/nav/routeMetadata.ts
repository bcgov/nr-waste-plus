import type { FeatureFlags } from '@/env';
import type { NavMeta } from '@/routing/staticData';
import type { Role } from '@/types/auth.types';

/**
 * Structural view of a router route — the minimum needed to read static
 * metadata without importing full TanStack generics.
 *
 * `router.routesById` values are structurally compatible; the narrow cast in
 * consumers is a metadata-access boundary, not a navigation cast.
 */
export type RouteLike = {
  options?: {
    staticData?: StaticDataLike;
    getParentRoute?: () => RouteLike | undefined;
  };
};

/**
 * Loose view of the app's `StaticDataRouteOption` augmentation for metadata
 * walks. The typed augmentation lives in `@/routing/staticData`; this loose
 * shape exists because route objects obtained from `routesById` carry the
 * merged generic type, and walking parents loses the specific static data.
 */
export type StaticDataLike = {
  /** Side-navigation entry; presence makes the route nav-visible. */
  nav?: NavMeta;
  /** Any-of role gate (`Role` values, compared against `FamRole.role`). */
  roles?: readonly Role[];
  /** Feature flag that must be truthy for the route (and nav entry). */
  featureFlag?: keyof FeatureFlags;
  /** Offline predicate: hidden while online. */
  offlineOnly?: boolean;
  /** Offline predicate: remains visible while offline. */
  offlineReady?: boolean;
  /** Document/base title written by the root layout at hierarchy 1. */
  title?: string;
};

/** Gate-related static data collected from a route ancestor chain. */
export type RouteGateStaticData = Pick<
  StaticDataLike,
  'roles' | 'featureFlag' | 'offlineOnly' | 'offlineReady'
>;

/**
 * Collects gate metadata (`roles`, `featureFlag`, offline flags) from a route
 * and its ancestor chain.
 *
 * `staticData` is per-match/per-route (never merged by the router), so gate
 * inheritance is explicit: values are collected leaf-first and the **nearest**
 * (most-derived) declaration wins.
 *
 * @param route - The starting route (leaf).
 * @returns The merged gate metadata.
 */
export const collectRouteGates = (route: RouteLike | undefined): RouteGateStaticData => {
  const merged: RouteGateStaticData = {};
  let current = route;
  while (current) {
    const staticData = current.options?.staticData;
    merged.roles = merged.roles ?? staticData?.roles;
    merged.featureFlag = merged.featureFlag ?? staticData?.featureFlag;
    merged.offlineOnly = merged.offlineOnly ?? staticData?.offlineOnly;
    merged.offlineReady = merged.offlineReady ?? staticData?.offlineReady;
    current = current.options?.getParentRoute?.();
  }
  return merged;
};

/**
 * Resolves the document title for a route by walking its ancestor chain:
 * at each level, `staticData.title` wins, then `staticData.nav.label`.
 * The nearest (most-derived) match wins — leaf titles beat ancestors.
 *
 * Returns `undefined` when no level declares a title (the caller then leaves
 * the document title untouched — parity with the legacy registry lookup).
 *
 * @param route - The starting route (leaf).
 * @returns The resolved title, or `undefined`.
 */
export const resolveRouteTitle = (route: RouteLike | undefined): string | undefined => {
  let current = route;
  while (current) {
    const staticData = current.options?.staticData;
    if (staticData?.title) return staticData.title;
    if (staticData?.nav?.label) return staticData.nav.label;
    current = current.options?.getParentRoute?.();
  }
  return undefined;
};
