import { ToolKit } from '@carbon/icons-react';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { featureFlags } from '@/env';

/**
 * Configuration section layout under the admin tier.
 *
 * `beforeLoad` flag gate covers the whole subtree (single check; DEC-008).
 * Carries the side-nav entry (order 40) so `/configuration` is the nav target
 * without an index trailing slash. Renders `<Outlet/>` by default.
 */
export const Route = createFileRoute('/_authenticated/_admin/configuration')({
  beforeLoad: () => {
    if (!featureFlags['configuration-enabled']) throw notFound();
  },
  staticData: {
    featureFlag: 'configuration-enabled',
    // Visible while offline: the legacy side nav hard-coded this link outside
    // the registry's connectivity filter, so an ADMIN with the flag on kept
    // seeing it offline. `offlineReady` preserves that (the other entries
    // came from the filtered registry and stay hidden offline).
    offlineReady: true,
    nav: { label: 'Configuration', icon: ToolKit, order: 40, to: '/configuration' },
  },
});
