import { FormDevtoolsPanel } from '@tanstack/react-form-devtools';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import { type ReactElement } from 'react';

import NotificationsPanel from './NotificationsPanel';
import { router } from '@/routes/routeTree';

/**
 * Definition of a content panel hosted by the devtools shell.
 */
export interface DevtoolsPanelDefinition {
  /**
   * Stable identifier persisted in the disabled-panels preference.
   * Renaming an id resets that panel's enabled state for developers.
   */
  readonly id: string;
  /** Display name shown as the devtools tab title. */
  readonly name: string;
  /** Panel content rendered inside the devtools shell. */
  readonly render: ReactElement;
  /** Whether the panel is added to the active tabs on initial load. */
  readonly defaultOpen: boolean;
}

/**
 * Registry of devtools content panels.
 *
 * The devtools shell is only ever loaded behind the dev-only guard in `App`,
 * so the stock TanStack panel imports here never reach a production bundle.
 * The {@link ./PanelsPreferencePanel | Panels preference panel} is managed
 * separately in `DevTools.tsx` — it must stay enabled so disabled panels
 * can always be re-enabled.
 */
export const DEVTOOLS_PANELS: readonly DevtoolsPanelDefinition[] = [
  {
    id: 'form',
    name: 'TanStack Form',
    render: <FormDevtoolsPanel initialIsOpen={false} />,
    defaultOpen: false,
  },
  {
    id: 'query',
    name: 'TanStack Query',
    render: <ReactQueryDevtools initialIsOpen={false} />,
    defaultOpen: false,
  },
  {
    id: 'router',
    name: 'TanStack Router',
    render: <TanStackRouterDevtools initialIsOpen={false} router={router} />,
    defaultOpen: false,
  },
  {
    id: 'notifications',
    name: 'Notifications',
    render: <NotificationsPanel />,
    defaultOpen: false,
  },
];
