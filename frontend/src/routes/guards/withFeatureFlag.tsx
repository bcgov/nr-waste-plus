import { notFound } from '@tanstack/react-router';
import { type ComponentType } from 'react';

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
 * @param isEnabled - Whether the feature is currently enabled. Falsy values
 * ({@code undefined}, {@code false}) are treated as disabled.
 * @returns A HOC that renders the component only when {@code isEnabled} is {@code true}.
 */
export function withFeatureFlag<P extends object>(
  Component: ComponentType<P>,
  isEnabled: boolean | undefined,
): ComponentType<P> {
  function FeatureFlagGuard(props: P) {
    if (!isEnabled) {
      throw notFound();
    }

    return <Component {...props} />;
  }

  FeatureFlagGuard.displayName = `withFeatureFlag(${Component.displayName ?? Component.name ?? 'Component'})`;
  return FeatureFlagGuard;
}
