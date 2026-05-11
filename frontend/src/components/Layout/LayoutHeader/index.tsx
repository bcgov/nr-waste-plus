import { Header, HeaderMenuButton, HeaderName, SkipToContent } from '@carbon/react';
import { Link } from '@tanstack/react-router';
import { type FC } from 'react';

import LayoutHeaderGlobalBar from './LayoutHeaderGlobalBar';
import { getFormattedEnvName } from './utils';

import { LayoutHeaderPanel } from '@/components/Layout/LayoutHeaderPanel';
import { LayoutSideNav } from '@/components/Layout/LayoutSideNav';
import { useLayout } from '@/context/layout/useLayout';
import { env } from '@/env';

import './index.scss';

/**
 * Renders the global application header, menu toggle, and shell actions.
 *
 * @returns The layout header component.
 */
export const LayoutHeader: FC = () => {
  const { isSideNavExpanded, toggleSideNav } = useLayout();

  const appName = env.VITE_APP_NAME;

  const formattedEnvName = getFormattedEnvName(env.VITE_NODE_ENV);
  const isProd = env.VITE_NODE_ENV.endsWith('prod');

  return (
    <Header aria-label={appName} className="bc-header" data-testid="bc-header__header">
      <SkipToContent />
      <HeaderMenuButton
        aria-label={isSideNavExpanded ? 'Close menu' : 'Open menu'}
        isActive={isSideNavExpanded}
        onClick={toggleSideNav}
      />
      <HeaderName as={Link} to={'/dashboard'} prefix="">
        <span>{appName}</span>
        {!isProd && <span>Env. {formattedEnvName}</span>}
      </HeaderName>

      <LayoutHeaderGlobalBar />
      <LayoutHeaderPanel />
      <LayoutSideNav />
    </Header>
  );
};
