import { Login } from '@carbon/icons-react';
import { Button, Column, Grid } from '@carbon/react';
import { useEffect } from 'react';

import type { BreakpointType } from '@/hooks/useBreakpoint/types';
import type { FC } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { useTheme } from '@/context/theme/useTheme';
import useBreakpoint from '@/hooks/useBreakpoint';

import './index.scss';

/**
 * Preload hints scoped to the Landing route. Injected imperatively into
 * `document.head` on mount and removed on unmount so other routes never
 * trigger the "preloaded but not used" browser warning. Re-applied when the
 * theme changes so the logo preload matches the `<img>` actually rendered.
 *
 * The `landing.webp` hero is a static asset; the logo is theme-conditional
 * (`g100` → `bc-gov-logo-rev.svg`, otherwise `bc-gov-logo.svg`), so the
 * preload `href` tracks the same theme value as the image src.
 */
const LANDING_PRELOAD_HREF = '/img/landing.webp';
const LOGO_PRELOAD_HREF_BY_THEME: Record<string, string> = {
  g100: '/img/bc-gov-logo-rev.svg',
  default: '/img/bc-gov-logo.svg',
};

/**
 * Displays the public landing page and authentication entry points.
 *
 * @returns The landing page content.
 */
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
   * Determines whether the login buttons should share a single row.
   */
  const isBtnSingleRow = breakpoint === 'max' || breakpoint === 'xlg' || breakpoint === 'md';

  /**
   * Logo URL matching the current theme. Mirrors the `src` of the logo `<img>`
   * below so the preload hint always targets the asset that will actually be
   * rendered (otherwise the browser would fetch a different theme variant and
   * re-emit the same "preloaded but not used" warning).
   */
  const logoSrc =
    theme === 'g100' ? LOGO_PRELOAD_HREF_BY_THEME.g100 : LOGO_PRELOAD_HREF_BY_THEME.default;

  /**
   * Inject `<link rel="preload">` hints for the Landing page above-the-fold
   * images into `document.head` on mount, and remove them on unmount. The
   * hints are scoped to this route only — other routes never emit them, so the
   * browser's "preloaded but not used within N seconds" warning is suppressed
   * app-wide except on Landing, where the corresponding `<img>` elements
   * consume the preloaded URLs during the initial render.
   *
   * Re-runs when `logoSrc` changes (theme switch) so the preload target
   * matches the rendered `<img>`.
   */
  useEffect(() => {
    const links: HTMLLinkElement[] = [];

    const addLink = (href: string, type: string, as: 'image', fetchpriority?: 'high') => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = as;
      link.type = type;
      link.href = href;
      if (fetchpriority) {
        link.fetchPriority = fetchpriority;
      }
      document.head.appendChild(link);
      links.push(link);
    };

    addLink(logoSrc, 'image/svg+xml', 'image');
    addLink(LANDING_PRELOAD_HREF, 'image/webp', 'image', 'high');

    return () => {
      for (const link of links) {
        link.remove();
      }
    };
  }, [logoSrc]);

  return (
    <div className="landing-grid-container">
      <Grid fullWidth className="landing-grid">
        <Column className="landing-content-col" sm={4} md={8} lg={8}>
          <div className="landing-content-wrapper" style={{ gap: `${elementGap}rem` }}>
            <header>
              {/* Logo */}
              <div>
                <img
                  src={theme === 'g100' ? '/img/bc-gov-logo-rev.svg' : '/img/bc-gov-logo.svg'}
                  alt="BCGov Logo"
                  width={160}
                  height={62}
                  className="logo"
                />
              </div>
            </header>

            <main>
              {/* Welcome - Title and Subtitle */}
              <h1 data-testid="landing-title" className="landing-title">
                Waste Plus
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
            </main>
          </div>
        </Column>
        <Column
          className="landing-img-col"
          sm={4}
          md={8}
          lg={8}
          as="aside"
          aria-label="Landing image"
        >
          <img
            src="/img/landing.webp"
            alt="Landing cover"
            className="landing-img"
            fetchPriority="high"
          />
        </Column>
      </Grid>
    </div>
  );
};

export default LandingPage;
