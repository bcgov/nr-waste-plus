import { useNavigate } from '@tanstack/react-router';
import { useLayoutEffect, type ComponentType } from 'react';

import useOfflineMode from '@/hooks/useOfflineMode';
import { navigateInTree } from '@/routes/inTreePaths';

/** Configuration options for the {@link withOfflineSupport} guard. */
interface OfflineOptions {
  /** When `true`, the route is only accessible when the device is offline. */
  offlineOnly?: boolean;
  /** When `true`, the route is accessible regardless of connectivity. */
  offlineReady?: boolean;
}

/**
 * HOC guard: restricts or allows route access based on network connectivity.
 *
 * Uses {@link useOfflineMode} (backed by `onlineStatusStore`) to reactively
 * track connectivity via `navigator.onLine` and browser `online`/`offline` events.
 *
 * Behaviour by option:
 * - `offlineReady: true` — no restriction; component always renders.
 * - `offlineOnly: true` — renders only when the device is **offline**;
 *   online users are immediately redirected to `/search`.
 *
 * @param Component - The route component to wrap.
 * @param options - Offline connectivity options.
 * @returns A HOC that enforces the connectivity restriction before the first paint.
 */
export function withOfflineSupport<P extends object>(
  Component: ComponentType<P>,
  options?: OfflineOptions,
): ComponentType<P> {
  const { offlineOnly = false } = options ?? {};

  function OfflineSupport(props: P) {
    const { isOnline } = useOfflineMode();
    const navigate = useNavigate();

    useLayoutEffect(() => {
      if (offlineOnly && isOnline) {
        navigateInTree(navigate, '/search', { replace: true });
      }
    }, [isOnline, navigate]);

    if (offlineOnly && isOnline) return null;

    return <Component {...props} />;
  }

  OfflineSupport.displayName = `withOfflineSupport(${Component.displayName ?? Component.name ?? 'Component'})`;
  return OfflineSupport;
}
