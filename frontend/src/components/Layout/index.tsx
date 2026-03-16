import { Content, Grid, HeaderContainer } from '@carbon/react';

import { LayoutHeader } from './LayoutHeader';

import type { FC, ReactNode } from 'react';

import { LayoutProvider } from '@/context/layout/LayoutProvider';

/**
 * Wraps a page in the application shell, including header, side nav, and grid content.
 *
 * @param props The layout props.
 * @param props.children The page content to render inside the shell.
 * @returns The full application layout.
 */
const Layout: FC<{ children: ReactNode }> = ({ children }) => {
  return (
    <>
      <LayoutProvider>
        <HeaderContainer render={LayoutHeader} />
        <Content>
          <Grid className="layout-grid cds--grid--no-gutter">{children}</Grid>
        </Content>
      </LayoutProvider>
    </>
  );
};

export default Layout;
