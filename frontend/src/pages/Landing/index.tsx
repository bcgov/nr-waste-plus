import { Login } from '@carbon/icons-react';
import { Button, Column, Grid } from '@carbon/react';

import logo_rev from '@/assets/img/bc-gov-logo-rev.png';
import logo from '@/assets/img/bc-gov-logo.png';
import LandingImg from '@/assets/img/landing.png';
import { useAuth } from '@/context/auth/useAuth';
import { useTheme } from '@/context/theme/useTheme';
import useBreakpoint from '@/hooks/useBreakpoint';

import type { BreakpointType } from '@/hooks/useBreakpoint/types';
import type { FC } from 'react';

import './index.scss';

const LandingPage: FC = () => {
  const { login } = useAuth();
  const breakpoint = useBreakpoint();
  const { theme } = useTheme();

  // Unit is rem
  const elementMarginMap: Record<BreakpointType, number> = {
    max: 6,
    xlg: 6,
    lg: 6,
    md: 3,
    sm: 2.5,
  };

  /**
   * Defines the vertical gap between the title, subtitle, and buttons.
   */
  const elementGap = elementMarginMap[breakpoint] || elementMarginMap.sm;

  /**
   * Defines whether the login buttons should be on the same row.
   */
  const isBtnSingleRow = breakpoint === 'max' || breakpoint === 'xlg' || breakpoint === 'md';

  return (
    <div className="landing-grid-container">
      <Grid fullWidth className="landing-grid">
        <Column className="landing-content-col" sm={4} md={8} lg={8}>
          <div className="landing-content-wrapper" style={{ gap: `${elementGap}rem` }}>
            {/* Logo */}
            <div>
              <img
                src={theme === 'g100' ? logo_rev : logo}
                alt="BCGov Logo"
                width={160}
                className="logo"
              />
            </div>

            {/* Welcome - Title and Subtitle */}
            <h1 data-testid="landing-title" className="landing-title">
              Harvest Residue System
            </h1>

            <h2 data-testid="landing-subtitle" className="landing-subtitle">
              Report logging waste and residue data for billing and cut control
            </h2>

            {/* Login buttons */}
            <div className={`buttons-container ${isBtnSingleRow ? 'single-row' : 'two-rows'}`}>
              <Button
                type="button"
                onClick={() => login('IDIR')}
                renderIcon={Login}
                data-testid="landing-button__idir"
                className="login-btn"
              >
                Log in with IDIR
              </Button>

              <Button
                type="button"
                kind="tertiary"
                onClick={() => login('BCEIDBUSINESS')}
                renderIcon={Login}
                data-testid="landing-button__bceid"
                className="login-btn"
                id="bceid-login-btn"
              >
                Log in with Business BCeID
              </Button>
            </div>
          </div>
        </Column>
        <Column className="landing-img-col" sm={4} md={8} lg={8}>
          <img src={LandingImg} alt="Landing cover" className="landing-img" />
        </Column>
      </Grid>
    </div>
  );
};

export default LandingPage;
