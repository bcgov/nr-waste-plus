import { notFound } from '@tanstack/react-router';
import { type ComponentType } from 'react';

import { featureFlags } from '@/env';

/**
 * HOC guard: renders the wrapped component only when the given feature flag is enabled.
 *
 * When the flag is disabled, throws a router-level not-found error so the route
 * is treated as if it never existed (same as a 404). This triggers the root route's
 * `notFoundComponent` (`NotFoundRedirect`), which:
 *
 * - **Authenticated users** → renders `NotFoundPage` ("Content Not Found")
 * - **Unauthenticated users** → redirects to `/` (landing page)
 *
 * @param Component - The route component to gate.
 * @param flagName - The name of the feature flag to check. If `undefined` or not set,
 * the component is always rendered. Falsy flag values are treated as disabled.
 * @returns A HOC that renders the component only when the feature flag is enabled.
 */
export function withFeatureFlag<P extends object>(
  Component: ComponentType<P>,
  flagName?: keyof import('@/env').FeatureFlags,
): ComponentType<P> {
  function FeatureFlagGuard(props: P) {
    if (flagName && !featureFlags[flagName]) {
      throw notFound();
    }

    return <Component {...props} />;
  }

  FeatureFlagGuard.displayName = `withFeatureFlag(${Component.displayName ?? Component.name ?? 'Component'})`;
  return FeatureFlagGuard;
}
