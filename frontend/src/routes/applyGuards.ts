import { type ComponentType } from 'react';

import { withFeatureFlag } from './guards/withFeatureFlag';
import { withOfflineSupport } from './guards/withOfflineSupport';
import { withProtected } from './guards/withProtected';
import { type RouteDescription } from './routePaths';

/**
 * Composes HOC guards onto a route component based on its {@link RouteDescription}.
 *
 * Guards are applied innermost-first so that the outermost HOC in the chain runs first
 * at render time. Application order:
 *
 * 1. `withFeatureFlag` (innermost) — applied when `featureFlag` is set on the route.
 * 2. `withOfflineSupport` — applied when `offlineOnly` or `offlineReady` is set.
 * 3. `withProtected` — applied when `protected: true` (with optional `roles` check).
 * 4. `guards[]` (outermost) — custom guards listed in `RouteDescription.guards`; applied
 *    left-to-right, so `guards[0]` becomes the outermost wrapper.
 *
 * @param desc - The route description containing component and guard configuration.
 * @returns The component wrapped with all applicable HOC guards.
 */
export function applyGuards(desc: RouteDescription): ComponentType {
  let Component: ComponentType = desc.component;

  if (desc.featureFlag) {
    Component = withFeatureFlag(Component, desc.featureFlag);
  }

  if (desc.offlineOnly || desc.offlineReady) {
    Component = withOfflineSupport(Component, {
      offlineOnly: desc.offlineOnly,
      offlineReady: desc.offlineReady,
    });
  }

  if (desc.protected) {
    Component = withProtected(Component, desc.roles);
  }

  for (const guard of desc.guards ?? []) {
    Component = guard(Component);
  }

  return Component;
}
