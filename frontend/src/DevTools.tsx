/* eslint-disable import/order */
import { TanStackDevtools } from '@tanstack/react-devtools';
import { FormDevtoolsPanel } from '@tanstack/react-form-devtools';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { type FC } from 'react';

import { router } from '@/routes/routeTree';

/**
 * Development-only devtools panel.
 *
 * This module is lazy-loaded behind an `import.meta.env.DEV` guard in
 * {@link App} — Vite statically eliminates this entire chunk from production
 * builds. It must never be imported directly outside of that guard.
 */
const DevTools: FC = () => (
  <TanStackDevtools
    plugins={[
      {
        name: 'TanStack Form',
        render: <FormDevtoolsPanel initialIsOpen={false} />,
        defaultOpen: false,
      },
      {
        name: 'TanStack Query',
        render: <ReactQueryDevtools initialIsOpen={false} />,
        defaultOpen: false,
      },
      {
        name: 'TanStack Router',
        render: <TanStackRouterDevtools initialIsOpen={false} router={router} />,
        defaultOpen: false,
      },
    ]}
  />
);

export default DevTools;
