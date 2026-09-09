import { useId } from 'react';

import ColorTag, { type CarbonColors } from '@/components/core/Tags/ColorTag';

/** Props for rendering a variable group panel within the formula input. */
interface VariablePanelProps {
  /** Section title shown above the variable tags. */
  label: string;
  /** Variable entries rendered as [name, numericValue] pairs. */
  entries: [string, number][];
  /** Accent color used for variables that are currently referenced by the formula. */
  tagType: Extract<CarbonColors, 'blue' | 'teal'>;
  /** Set of variable names that are currently used in the active formula expression. */
  usedSet: Set<string>;
}

/**
 * Renders a labeled list of formula variables with visual status for usage.
 *
 * Variables present in `usedSet` are highlighted with the provided `tagType`, while
 * non-referenced variables are displayed in gray to distinguish available values.
 *
 * @param props - Component configuration containing the group label, variable entries, and usage state.
 * @returns The variable group UI, or `null` when there are no entries to show.
 */
const VariablePanel: React.FC<VariablePanelProps> = ({ label, entries, tagType, usedSet }) => {
  const labelId = useId();

  if (entries.length === 0) return null;

  return (
    <div className="formula-input__variable-group">
      <p id={labelId} className="formula-input__section-label">
        {label}
      </p>
      <ul className="formula-input__tags" aria-labelledby={labelId}>
        {entries.map(([name, value]) => {
          const isUsed = usedSet.has(name);

          return (
            <li key={name}>
              <span className="sr-only">{isUsed ? 'Used in formula' : 'Available'}</span>
              <ColorTag
                value={{ code: name, description: String(value) }}
                colorMap={{ [name]: isUsed ? tagType : 'gray' }}
                showTooltip
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default VariablePanel;
