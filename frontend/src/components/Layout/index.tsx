import { Content, Grid, HeaderContainer } from '@carbon/react';

import { LayoutHeader } from './LayoutHeader';

import type { FC, ReactNode } from 'react';

import { LayoutProvider } from '@/context/layout/LayoutProvider';

/**
 * Props for the {@link Layout} component.
 */
interface LayoutProps {
  /** Page content rendered inside the shell's main grid area. */
  readonly children: ReactNode;
}

/**
 * Application shell layout component.
 *
 * Wraps routed page content in the shared Carbon application shell by composing:
 * - {@link LayoutProvider}: supplies side-nav expansion state to all descendants
 * - {@link HeaderContainer}: manages Carbon's header/side-nav interaction lifecycle
 *   and renders {@link LayoutHeader}
 * - {@link Content}: Carbon's main content region
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
        <HeaderContainer render={LayoutHeader} />
        <Content>
          <Grid className="layout-grid cds--grid--no-gutter" data-testid="layout-grid">
            {children}
          </Grid>
        </Content>
      </LayoutProvider>
    </>
  );
};

export default Layout;
