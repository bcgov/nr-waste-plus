import { AsleepFilled, LightFilled } from '@carbon/icons-react';
import { type FC } from 'react';
import './index.scss';

import { useTheme } from '@/context/theme/useTheme';

const ThemeToggle: FC = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <div
      className={`theme-toggle ${theme !== 'g10' ? 'on' : 'off'}`}
      onClick={toggleTheme}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          toggleTheme();
        }
      }}
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
