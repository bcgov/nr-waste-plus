import { Content, Grid, HeaderContainer } from '@carbon/react';

import { LayoutHeader } from './LayoutHeader';

import type { FC, ReactNode } from 'react';

import { LayoutProvider } from '@/context/layout/LayoutProvider';

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
