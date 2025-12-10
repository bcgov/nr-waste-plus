import { HeaderGlobalAction, HeaderGlobalBar } from '@carbon/react';
import { type FC } from 'react';

import AvatarImage from '@/components/Layout/AvatarImage';
import ClientDisplay from '@/components/Layout/HeaderDistrictDisplay/ClientDisplay';
import DistrictDisplay from '@/components/Layout/HeaderDistrictDisplay/DistrictDisplay';
import ThemeToggle from '@/components/Layout/ThemeToggle';
import { useAuth } from '@/context/auth/useAuth';
import { useLayout } from '@/context/layout/useLayout';
import { useTheme } from '@/context/theme/useTheme';
import './LayoutHeaderGlobalBar.scss';

const LayoutHeaderGlobalBar: FC = () => {
  const { toggleHeaderPanel, isHeaderPanelOpen } = useLayout();
  const { user } = useAuth();
  const { theme } = useTheme();

  return (
    <HeaderGlobalBar>
      <HeaderGlobalAction
        aria-label={`Switch to ${theme === 'g100' ? 'light' : 'dark'} mode`}
        tooltipAlignment="end"
      >
        <ThemeToggle />
      </HeaderGlobalAction>

      <HeaderGlobalAction
        aria-label="Profile settings"
        tooltipAlignment="end"
        onClick={toggleHeaderPanel}
        isActive={isHeaderPanelOpen}
        className="profile-action-button"
      >
        <AvatarImage userName={`${user?.firstName} ${user?.lastName}`} size="small" />
        {user?.idpProvider === 'BCEIDBUSINESS' ? (
          <ClientDisplay isActive={isHeaderPanelOpen} />
        ) : (
          <DistrictDisplay isActive={isHeaderPanelOpen} />
        )}
      </HeaderGlobalAction>
    </HeaderGlobalBar>
  );
};

export default LayoutHeaderGlobalBar;
