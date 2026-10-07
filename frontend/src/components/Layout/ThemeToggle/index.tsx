import { AsleepFilled, LightFilled } from '@carbon/icons-react';
import { type FC } from 'react';
import './index.scss';

import { useTheme } from '@/context/theme/useTheme';

/**
 * Toggles between the supported Carbon light and dark themes.
 *
 * @param props Component options.
 * @param props.interactive Whether the component owns keyboard and click behavior.
 * @returns A theme toggle control.
 */
interface ThemeToggleProps {
  readonly interactive?: boolean;
}

const ThemeToggle: FC<ThemeToggleProps> = ({ interactive = true }) => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div
      className={`theme-toggle ${theme !== 'g10' ? 'on' : 'off'}`}
      onClick={interactive ? toggleTheme : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                toggleTheme();
              }
            }
          : undefined
      }
    >
      <div className="circle">
        {theme !== 'g10' ? (
          <AsleepFilled className="icon dark" aria-label="dark mode" />
        ) : (
          <LightFilled className="icon light" aria-label="light mode" />
        )}
      </div>
    </div>
  );
};

export default ThemeToggle;
