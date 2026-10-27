import { Content, Grid, HeaderContainer } from '@carbon/react';
import { useRouterState } from '@tanstack/react-router';
import { useEffect, type FC, type ReactNode } from 'react';

import { LayoutProvider } from '@/context/layout/LayoutProvider';
import { useLayout } from '@/context/layout/useLayout';

import { LayoutHeader } from './LayoutHeader';

/**
 * Props for the {@link Layout} component.
 */
interface LayoutProps {
  /** Page content rendered inside the shell's main grid area. */
  readonly children: ReactNode;
}

/**
 * Resets the manual side-nav toggle when navigation commits.
 *
 * Renders inside {@link LayoutProvider} so it can read the layout context the
 * provider owns. Without this, the persistent file-based `Layout` keeps the
 * mobile hamburger menu expanded over the page the user navigated to — the
 * legacy registry remounted the shell per page, implicitly resetting the state.
 * Resetting the manual toggle (not the expansion itself) preserves desktop:
 * large viewports stay expanded through the breakpoint-derived default.
 */
function LayoutNavigationReset() {
  const { resetSideNav } = useLayout();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    resetSideNav();
  }, [pathname, resetSideNav]);

  return null;
}

/**
 * Application shell layout component.
 *
 * Wraps routed page content in the shared Carbon application shell by composing:
 * - {@link LayoutProvider}: supplies side-nav expansion state to all descendants
 * - {@link HeaderContainer}: manages Carbon's header/side-nav interaction lifecycle
 *   and renders {@link LayoutHeader}
 * - {@link Content}: Carbon's main content region, targeted by the header's
 *   skip link via `id="main-content"`; `tabIndex={-1}` lets fragment navigation
 *   move focus onto the landmark without adding it to the tab order
 * - {@link Grid}: a no-gutter grid with the `layout-grid` class for page-level spacing
 *
 * @param props - Component props.
 * @param props.children - The page content rendered inside the grid.
 * @returns The full application shell wrapping the supplied children.
 */
const Layout: FC<LayoutProps> = ({ children }: LayoutProps) => {
  return (
    <>
      <LayoutProvider>
        <LayoutNavigationReset />
        <HeaderContainer render={LayoutHeader} />
        <Content id="main-content" tabIndex={-1}>
          <Grid className="layout-grid cds--grid--no-gutter" data-testid="layout-grid">
            {children}
          </Grid>
        </Content>
      </LayoutProvider>
    </>
  );
};

export default Layout;
