import type { FeatureFlags } from '@/env';
import type { Role } from '@/types/auth.types';
import type { ComponentType } from 'react';

/**
 * Literal union of side-navigation destinations.
 *
 * Deliberately narrower than `route.fullPath`: keeping `nav.to` as a literal
 * member keeps `Link`/`navigate` fully typed with no casts (DEC-009).
 */
export type NavTarget = '/clients' | '/search' | '/reporting-units/create' | '/configuration';

/**
 * Navigation metadata attached to a route's `staticData`.
 */
export type NavMeta = {
  /** Visible label in the side navigation. */
  label: string;
  /** Carbon icon component rendered beside the label. */
  icon?: ComponentType;
  /** Sort order; lower renders first. */
  order: number;
  /** Typed navigation target. */
  to: NavTarget;
};

/**
 * Per-route static metadata consumed by the navigation projection
 * (`useNavEntries`) and the root title sync.
 *
 * `staticData` is per-match, not inherited at runtime — consumers that need
 * gate metadata (roles/flags) walk `route.parentRoute` explicitly.
 */
declare module '@tanstack/router-core' {
  interface StaticDataRouteOption {
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
  }
}
