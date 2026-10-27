import { Help } from '@carbon/icons-react';
import { SideNav, SideNavItems, SideNavLink } from '@carbon/react';
import { Link, useRouterState } from '@tanstack/react-router';
import { type FC, type ReactElement } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { useLayout } from '@/context/layout/useLayout';
import { env } from '@/env';
import { useNavEntries, type NavEntry } from '@/routing/nav/useNavEntries';

import './index.scss';

/**
 * Collapsible side navigation shell for the application.
 *
 * Entries are projected from route `staticData` metadata through
 * {@link useNavEntries} — one source of truth with role, feature-flag, and
 * connectivity filtering inherited from the route tree (DEC-009). `to` targets
 * are literal `NavTarget` members, so every side-nav link is a typed TanStack
 * `Link` with no casts.
 *
 * The "Need Help?" footer link is always rendered and points to the IDIR or
 * BCeID help URL depending on the authenticated user's identity provider; it
 * is an external document, rendered as a native anchor.
 *
 * Expansion state is controlled externally via {@link useLayout}.
 *
 * @returns The application side navigation.
 */
export const LayoutSideNav: FC = () => {
  const { isSideNavExpanded } = useLayout();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const entries = useNavEntries();

  /**
   * Renders a flat {@link SideNavLink} for a nav entry.
   *
   * @param entry - The nav entry to render as a navigation link.
   * @returns A side-nav link element navigating to `entry.to`.
   */
  const renderMenuLink = (entry: NavEntry): ReactElement => (
    <SideNavLink
      data-testid={`side-nav-link-${entry.id}`}
      key={entry.id}
      as={Link}
      to={entry.to}
      isActive={entry.to === pathname}
      renderIcon={entry.icon}
    >
      {entry.id}
    </SideNavLink>
  );

  return (
    <SideNav expanded={isSideNavExpanded} isPersistent={isSideNavExpanded} isChildOfHeader>
      <SideNavItems>{entries.map(renderMenuLink)}</SideNavItems>
      <SideNavItems>
        <SideNavLink
          data-testid="side-nav-link-help"
          as="a"
          href={user?.idpProvider === 'IDIR' ? env.VITE_IDIR_HELP : env.VITE_BCEID_HELP}
          target="_blank"
          rel="noopener noreferrer"
          renderIcon={Help}
        >
          Need Help?
        </SideNavLink>
      </SideNavItems>
    </SideNav>
  );
};
