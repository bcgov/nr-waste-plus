import { Content, Grid, HeaderContainer } from '@carbon/react';

import { LayoutProvider } from '@/context/layout/LayoutProvider';

import { LayoutHeader } from './LayoutHeader';

import type { FC, ReactNode } from 'react';

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
