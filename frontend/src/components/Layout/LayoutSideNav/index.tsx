import { SideNav, SideNavItems, SideNavLink, SideNavMenu, SideNavMenuItem } from '@carbon/react';
import { Link, useRouterState } from '@tanstack/react-router';
import { type FC, type ReactElement } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { useLayout } from '@/context/layout/useLayout';
import { env } from '@/env';
import useOfflineMode from '@/hooks/useOfflineMode';
import { getMenuEntries, type MenuItem } from '@/routes/routePaths';

import './index.scss';

/**
 * Collapsible side navigation shell for the application.
 *
 * Reads the current pathname from the TanStack Router state and the user's
 * authentication context to render the entries returned by {@link getMenuEntries}.
 * Top-level entries without children are rendered as flat {@link SideNavLink}
 * elements; entries with children are rendered as collapsible {@link SideNavMenu}
 * groups. A "Need Help?" footer link is always rendered and points to the
 * IDIR or BCeID help URL depending on the authenticated user's identity provider.
 *
 * Expansion state is controlled externally via {@link useLayout}, while online
 * status from {@link useOfflineMode} determines which route entries are shown.
 *
 * @returns The rendered application side navigation.
 */
export const LayoutSideNav: FC = () => {
  const { isSideNavExpanded } = useLayout();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isOnline } = useOfflineMode();
  const { user } = useAuth();

  /**
   * Renders the icon + text label for a menu item used inside a {@link SideNavMenu}.
   *
   * @param route - The menu entry whose icon and id are rendered.
   * @returns The menu label content used for nested navigation items.
   */
  const renderIcon = (route: MenuItem): ReactElement => {
    const Icon = route.icon;
    return (
      <div className="cds--side-nav__icon">
        {Icon ? <Icon /> : null}
        <span className="cds--side-nav__link-text">{route.id}</span>
      </div>
    );
  };

  /**
   * Renders a flat {@link SideNavLink} for a top-level route with no children.
   *
   * @param route - The menu entry to render as a navigation link.
   * @returns A side-nav link element navigating to `route.path`.
   */
  const renderMenuLink = (route: MenuItem): ReactElement => (
    <SideNavLink
      data-testid={`side-nav-link-${route.id}`}
      key={route.id}
      as={Link}
      to={route.path}
      isActive={route.path === pathname}
      renderIcon={route.icon}
    >
      {route.id}
    </SideNavLink>
  );

  /**
   * Renders a collapsible {@link SideNavMenu} group for a route that has children.
   *
   * Child paths are composed as `{parentPath}/{childPath}`. If a child has no
   * `path`, only the parent path is used (index-route behaviour).
   *
   * @param route - The parent menu entry containing nested child entries.
   * @returns A side-nav group whose children navigate to composed child paths.
   */
  const renderMenuItem = (route: MenuItem): ReactElement => {
    const childPath = (parentPath: string, route: MenuItem): string =>
      `${parentPath}${route.path ? `/${route.path}` : ''}`;
    return (
      <SideNavMenu
        data-testid={`side-nav-menu-${route.id}`}
        key={route.id}
        title={route.id}
        isActive={pathname.startsWith(route.path)}
        defaultExpanded={pathname.startsWith(route.path)}
        renderIcon={route.icon}
      >
        {route.children?.map((childRoute) => (
          <SideNavMenuItem
            data-testid={`side-nav-menu-item-${childRoute.id}`}
            key={childRoute.id}
            as={Link}
            to={childPath(route.path, childRoute)}
            isActive={childPath(route.path, childRoute) === pathname}
          >
            {renderIcon(childRoute)}
          </SideNavMenuItem>
        ))}
      </SideNavMenu>
    );
  };

  return (
    <SideNav expanded={isSideNavExpanded} isPersistent={isSideNavExpanded} isChildOfHeader>
      <SideNavItems>
        {getMenuEntries(isOnline, user?.roles || []).map((route) =>
          route.children ? renderMenuItem(route) : renderMenuLink(route),
        )}
      </SideNavItems>
      <SideNavItems>
        <SideNavLink
          data-testid="side-nav-link-help"
          as={Link}
          to={user?.idpProvider === 'IDIR' ? env.VITE_IDIR_HELP : env.VITE_BCEID_HELP}
          target="_blank"
          rel="noopener noreferrer"
        >
          Need Help?
        </SideNavLink>
      </SideNavItems>
    </SideNav>
  );
};
