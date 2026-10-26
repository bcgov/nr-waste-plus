import { useRouter } from '@tanstack/react-router';
import { useMemo, type ComponentType } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { featureFlags } from '@/env';
import useOfflineMode from '@/hooks/useOfflineMode';
import { hasAnyRole } from '@/routing/auth';

import { collectRouteGates, type RouteLike, type StaticDataLike } from './routeMetadata';

import type { NavTarget } from '@/routing/staticData';
import type { FamRole } from '@/types/auth.types';

/**
 * A single side-navigation entry projected from route `staticData`.
 *
 * `id` is the visible label (legacy `MenuItem.id` parity); `to` is a literal
 * `NavTarget` member so `Link`/`navigate` stay typed with no casts (DEC-009).
 */
export type NavEntry = {
  /** Visible label. */
  id: string;
  /** Typed navigation target. */
  to: NavTarget;
  /** Carbon icon component. */
  icon?: ComponentType;
};

/**
 * Projects the side navigation from route `staticData` metadata.
 *
 * Replaces the legacy `getMenuEntries`/`isRouteAccessible` registry pair
 * (DEC-009). For every route carrying `staticData.nav`:
 *
 * 1. Inherits gates (`roles`, `featureFlag`, `offlineOnly`, `offlineReady`)
 *    from the ancestor chain — nearest declaration wins
 *    ({@link collectRouteGates}).
 * 2. Filters by connectivity (legacy `getMenuEntries` predicate: online hides
 *    `offlineOnly` routes; offline keeps only `offlineReady`/`offlineOnly`).
 * 3. Filters by feature flag truthiness and any-of role membership.
 * 4. Sorts by `nav.order`.
 *
 * Reads the router via `useRouter()` (not a singleton import) so the hook is
 * testable with a memory-history router.
 *
 * @returns The filtered, ordered nav entries.
 */
export function useNavEntries(): NavEntry[] {
  const router = useRouter();
  const { user } = useAuth();
  const { isOnline } = useOfflineMode();
  const userRoles: readonly FamRole[] | undefined = user?.roles;

  return useMemo(() => {
    // Metadata-access boundary: `routesById` values are structurally compatible
    // with RouteLike; the cast avoids importing TanStack's full generics.
    const routesById = (router as unknown as { routesById: Record<string, RouteLike> }).routesById;

    const entries: (NavEntry & { order: number })[] = [];

    for (const route of Object.values(routesById ?? {})) {
      const staticData: StaticDataLike | undefined = route.options?.staticData;
      const nav = staticData?.nav;
      if (!nav) continue;

      const gate = collectRouteGates(route);

      // Connectivity — legacy getMenuEntries predicate.
      const connectivityVisible = isOnline
        ? !gate.offlineOnly
        : !!(gate.offlineReady || gate.offlineOnly);
      if (!connectivityVisible) continue;

      // Feature flag — truthy required when declared.
      if (gate.featureFlag && !featureFlags[gate.featureFlag]) continue;

      // Role any-of — no restriction when undeclared (legacy
      // isRouteAccessible: empty/undefined required roles allow).
      if (gate.roles?.length && !hasAnyRole(userRoles, gate.roles)) continue;

      entries.push({ id: nav.label, to: nav.to, icon: nav.icon, order: nav.order });
    }

    // Sort before projecting: keep the in-place mutation out of the return
    // expression (SonarCloud S4043).
    entries.sort((a, b) => a.order - b.order);

    return entries.map(({ id, to, icon }) => ({ id, to, icon }));
  }, [router, userRoles, isOnline]);
}
