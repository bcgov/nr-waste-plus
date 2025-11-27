import { Close } from '@carbon/icons-react';
import { HeaderPanel, IconButton } from '@carbon/react';
import { useRef, type FC } from 'react';

import HeaderPanelProfile from '@/components/Layout/HeaderPanelProfile';
import { useLayout } from '@/context/layout/useLayout';
import { useOutsideClick } from '@/hooks/useOutsideClick';

import './index.scss';

export const LayoutHeaderPanel: FC = () => {
  const { isHeaderPanelOpen, closeHeaderPanel } = useLayout();
  const panelRef = useRef<HTMLDivElement>(null);

  useOutsideClick(panelRef, closeHeaderPanel, isHeaderPanelOpen);

  if (!isHeaderPanelOpen) return null;

  return (
    <HeaderPanel
      data-testid="header-panel"
      aria-label="User Profile Tab"
      className="profile-panel"
      expanded={isHeaderPanelOpen}
      ref={panelRef}
    >
      <div className="right-title-section">
        <h4>My Profile</h4>
        <div className="right-title-buttons">
          <IconButton kind="ghost" label="Close" onClick={closeHeaderPanel} align="bottom">
            <Close />
          </IconButton>
        </div>
      </div>
      <HeaderPanelProfile />
    </HeaderPanel>
  );
};
