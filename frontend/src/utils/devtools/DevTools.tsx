import { TanStackDevtools } from '@tanstack/react-devtools';
import { type FC, useCallback, useMemo, useState } from 'react';

import PanelsPreferencePanel from './PanelsPreferencePanel';
import { DEVTOOLS_PANELS } from './panels';
import { readDisabledPanelIds, writeDisabledPanelIds } from './panelPreferences';

/**
 * Development-only devtools shell.
 *
 * This module is lazy-loaded from `App` behind an `import.meta.env.DEV`
 * guard — Vite statically eliminates this entire chunk from production
 * builds. It must never be imported directly outside of that guard.
 *
 * Content panels come from the {@link ./panels | DEVTOOLS_PANELS} registry and
 * can be toggled live through the always-on "Panels" preference panel; the
 * disabled set persists across reloads via {@link ./panelPreferences | panelPreferences}.
 */
const DevTools: FC = () => {
  const [disabledIds, setDisabledIds] = useState<readonly string[]>(readDisabledPanelIds);

  const handleTogglePanel = useCallback((id: string) => {
    setDisabledIds((previous) => {
      const next = previous.includes(id)
        ? previous.filter((disabledId) => disabledId !== id)
        : [...previous, id];
      writeDisabledPanelIds(next);
      return next;
    });
  }, []);

  const plugins = useMemo(
    () => [
      ...DEVTOOLS_PANELS.filter((panel) => !disabledIds.includes(panel.id)).map((panel) => ({
        name: panel.name,
        render: panel.render,
        defaultOpen: panel.defaultOpen,
      })),
      {
        name: 'Panels',
        render: (
          <PanelsPreferencePanel panels={DEVTOOLS_PANELS} disabledIds={disabledIds} onToggle={handleTogglePanel} />
        ),
        defaultOpen: false,
      },
    ],
    [disabledIds, handleTogglePanel],
  );

  return <TanStackDevtools plugins={plugins} />;
};

export default DevTools;
