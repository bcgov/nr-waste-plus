import { Asleep, Light, Exit } from '@carbon/icons-react';
import { SideNavLink } from '@carbon/react';
import { type FC } from 'react';

import DistrictSelection from '@/components/core/DistrictSelection';
import AvatarImage from '@/components/Layout/AvatarImage';
import { useAuth } from '@/context/auth/useAuth';
import { useTheme } from '@/context/theme/useTheme';

import './index.scss';

const HeaderPanelProfile: FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();

  return (
    <div className="my-profile-container">
      <div className="user-info-section">
        <div className="user-image">
          <AvatarImage userName={`${user?.firstName} ${user?.lastName}`} size="large" />
        </div>
        <div className="user-data">
          <p
            className="user-name"
            data-testid="user-fullname"
          >{`${user?.firstName} ${user?.lastName}`}</p>
          <p>{`${user?.idpProvider ? user?.idpProvider + '\\' : null}${user?.userName}`}</p>
          <p>{`Email: ${user?.email}`}</p>
        </div>
      </div>
      <hr className="divisory" />
      <nav className="account-nav">
        <ul>
          <li>
            <div className="panel-section-light">
              <span>Select organization</span>
            </div>
            <div className="district-selection-container">
              <DistrictSelection />
            </div>
          </li>
          <li>
            <div className="panel-section-light">
              <span>Options</span>
            </div>
          </li>
          <SideNavLink
            className="cursor-pointer"
            renderIcon={theme === 'g100' ? Light : Asleep}
            onClick={toggleTheme}
          >
            Change theme
          </SideNavLink>
          <SideNavLink className="cursor-pointer" renderIcon={Exit} onClick={logout}>
            Log out
          </SideNavLink>
        </ul>
      </nav>
    </div>
  );
};

export default HeaderPanelProfile;
