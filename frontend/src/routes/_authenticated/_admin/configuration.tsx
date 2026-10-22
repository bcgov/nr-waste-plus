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
    nav: { label: 'Configuration', icon: ToolKit, order: 40, to: '/configuration' },
  },
});
