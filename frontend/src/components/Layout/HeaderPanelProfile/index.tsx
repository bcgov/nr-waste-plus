import { Exit, Help } from '@carbon/icons-react';
import { SideNavLink, Tooltip } from '@carbon/react';
import { type FC } from 'react';

import ClientListing from '@/components/core/DistrictSelection/ClientListing';
import DistrictListing from '@/components/core/DistrictSelection/DistrictListing';
import AvatarImage from '@/components/Layout/AvatarImage';
import { useAuth } from '@/context/auth/useAuth';

import './index.scss';

const HeaderPanelProfile: FC = () => {
  const { logout, user } = useAuth();

  const entityType = user?.idpProvider === 'BCEIDBUSINESS' ?  'client' :'organization';
  const tooltipText = `Optional: Select a default ${entityType}.`
  + ` This can help you do your searches faster if you work with one ${entityType} much more than others.`
  + ` You can change or remove this at any time.`;

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
          <li className='district-panel'>
            <Tooltip
              label={tooltipText}
            >
              <div className="panel-section-light">                
                  <span>Select {entityType}</span>
                  <Help aria-label={`Help: About selecting a default ${entityType}`} tabIndex={0} />                
              </div>
            </Tooltip>
              <div className="district-selection-container">
                {user?.idpProvider === 'BCEIDBUSINESS' ? 
                (<ClientListing />) 
                :
                (<DistrictListing />)
                }
              </div>
          </li>

        <SideNavLink className="cursor-pointer" renderIcon={Exit} onClick={logout}>
          Log out
        </SideNavLink>
        </ul>
      </nav>
    </div>
  );
};

export default HeaderPanelProfile;
