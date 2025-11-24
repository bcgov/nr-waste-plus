import { HeaderGlobalAction, HeaderGlobalBar } from '@carbon/react';
import { type FC } from 'react';

import ClientDisplay from '@/components/Layout/HeaderDistrictDisplay/ClientDisplay';
import DistrictDisplay from '@/components/Layout/HeaderDistrictDisplay/DistrictDisplay';
import ThemeToggle from '@/components/Layout/ThemeToggle';
import { useLayout } from '@/context/layout/useLayout';
import AvatarImage from '@/components/Layout/AvatarImage';
import { useAuth } from '@/context/auth/useAuth';

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
        {user?.idpProvider === 'BCEIDBUSINESS' 
        ? (<ClientDisplay isActive={isHeaderPanelOpen} />)
        : (<DistrictDisplay isActive={isHeaderPanelOpen} />)
        }
      </HeaderGlobalAction>
    </HeaderGlobalBar>
  );
};

export default LayoutHeaderGlobalBar;
