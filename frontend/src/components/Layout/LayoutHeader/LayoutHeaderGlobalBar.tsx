import { HeaderGlobalAction, HeaderGlobalBar } from '@carbon/react';
import { type FC } from 'react';

import AvatarImage from '@/components/Layout/AvatarImage';
import ClientDisplay from '@/components/Layout/HeaderDistrictDisplay/ClientDisplay';
import DistrictDisplay from '@/components/Layout/HeaderDistrictDisplay/DistrictDisplay';
import ThemeToggle from '@/components/Layout/ThemeToggle';
import { useAuth } from '@/context/auth/useAuth';
import { useLayout } from '@/context/layout/useLayout';

import './LayoutHeaderGlobalBar.scss';

const LayoutHeaderGlobalBar: FC = () => {
  const { toggleHeaderPanel, isHeaderPanelOpen } = useLayout();
  const { user } = useAuth();

  return (
    <HeaderGlobalBar>
      <HeaderGlobalAction aria-label="Theme" tooltipAlignment="end">
        <ThemeToggle />
      </HeaderGlobalAction>

      <HeaderGlobalAction
        aria-label="User settings"
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
