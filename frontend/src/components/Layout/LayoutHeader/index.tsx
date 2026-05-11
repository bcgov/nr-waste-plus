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
 * Global application header bar.
 *
 * Composes the Carbon {@link Header} shell with:
 * - A hamburger {@link HeaderMenuButton} that toggles the side navigation via
 *   {@link useLayout}
 * - A {@link HeaderName} rendered as a TanStack {@link Link} pointing to `/dashboard`;
 *   shows the application name and, in non-production environments, a formatted
 *   environment label derived from {@link getFormattedEnvName}
 * - The global action bar ({@link LayoutHeaderGlobalBar})
 * - The slide-out header panel ({@link LayoutHeaderPanel})
 * - The collapsible side navigation ({@link LayoutSideNav})
 *
 * The environment name label is hidden when `VITE_NODE_ENV` ends with `"prod"`.
 *
 * @returns The rendered Carbon header element.
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
