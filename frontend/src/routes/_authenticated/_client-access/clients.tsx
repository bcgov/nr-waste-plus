import { Group } from '@carbon/icons-react';
import { createFileRoute } from '@tanstack/react-router';

import MyClientListPage from '@/pages/MyClientList';

/**
 * `/clients` — client-access tier (any-of VIEWER/SUBMITTER; gate lives on the
 * `_client-access` layout). Side-nav order 10.
 */
export const Route = createFileRoute('/_authenticated/_client-access/clients')({
  component: MyClientListPage,
  staticData: {
    title: 'My clients',
    nav: { label: 'My clients', icon: Group, order: 10, to: '/clients' },
  },
});
