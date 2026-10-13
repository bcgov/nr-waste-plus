import { type FC } from 'react';

import { type DevtoolsPanelDefinition } from './panels';

interface PanelsPreferencePanelProps {
  /** All registered content panels, enabled or not. */
  readonly panels: readonly DevtoolsPanelDefinition[];
  /** Ids of the panels currently disabled. */
  readonly disabledIds: readonly string[];
  /** Called with a panel id when its checkbox is toggled. */
  readonly onToggle: (id: string) => void;
}

/**
 * Devtools preference panel listing every registered content panel with an
 * enabled checkbox. Rendered as a plugin of the devtools shell; it is not
 * part of the disableable registry so the preference UI can never hide itself.
 *
 * @param props The panel props.
 * @param props.panels All registered content panels.
 * @param props.disabledIds Ids of the currently disabled panels.
 * @param props.onToggle Toggle callback invoked with the panel id.
 * @returns The preference panel listing checkboxes for each content panel.
 */
const PanelsPreferencePanel: FC<PanelsPreferencePanelProps> = ({ panels, disabledIds, onToggle }) => (
  <div role="group" aria-label="Devtools panels" style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12 }}>
    {panels.map((panel) => {
      const isChecked = !disabledIds.includes(panel.id);
      return (
        <label key={panel.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={() => onToggle(panel.id)}
            aria-label={`Enable ${panel.name} panel`}
          />
          {panel.name}
        </label>
      );
    })}
  </div>
);

export default PanelsPreferencePanel;
