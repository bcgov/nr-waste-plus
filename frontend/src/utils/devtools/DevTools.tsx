import { TanStackDevtools } from '@tanstack/react-devtools';
import { type FC, useCallback, useMemo, useState } from 'react';

import PanelsPreferencePanel from './PanelsPreferencePanel';
import { DEVTOOLS_PANELS } from './panels';
import { readDisabledPanelIds, writeDisabledPanelIds } from './panelPreferences';

/**
 * Development-only devtools shell.
 *
 * This module is statically imported by `App` and rendered only when
 * `import.meta.env.DEV && MODE !== 'test'` — Vite folds the condition in
 * production builds and tree-shakes this entire module graph away. The
 * panel registry keeps this possible by staying side-effect-free.
 * It must never be rendered outside of that guard.
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
        render: () => (
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
