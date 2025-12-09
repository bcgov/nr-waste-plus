import { Tag, Tooltip } from '@carbon/react';
import { type FC } from 'react';

import './index.scss';

/**
 * Valid Carbon Design System tag color types.
 */
export type CarbonColors =
  | 'blue'
  | 'green'
  | 'gray'
  | 'red'
  | 'magenta'
  | 'purple'
  | 'cyan'
  | 'teal'
  | 'cool-gray'
  | 'warm-gray'
  | 'high-contrast'
  | 'outline'
  | undefined;

/**
 * Props for the ColorTag component.
 */
type ColorTagProps = {
  /** The value object containing code and description */
  value: { code: string; description: string } | null;
  /** Mapping of codes to Carbon color types */
  colorMap: Record<string, CarbonColors>;
};

/**
 * A colored tag component that displays a description with an optional tooltip.
 *
 * @param props - Component props
 * @param props.value - Object containing code and description to display
 * @param props.colorMap - Map of codes to Carbon Design System colors
 * @returns A Carbon Tag component, optionally wrapped in a Tooltip
 *
 * @example
 * ```tsx
 * <ColorTag
 *   value={{ code: 'A', description: 'Active' }}
 *   colorMap={{ 'A': 'green' }}
 * />
 * ```
 */
const ColorTag: FC<ColorTagProps> = ({ value, colorMap }) => {
  // If value is null, default to N/A
  const actualValue = value ?? { code: 'N/A', description: 'Not Applicable' };

  const hasCode = Boolean(actualValue.code?.trim());
  const hasDescription = Boolean(actualValue.description?.trim());

  const displayText = hasDescription ? actualValue.description : '-';

  // Determine tooltip: show if we have both code and description
  const tooltipLabel =
    hasCode && hasDescription ? `${actualValue.code} - ${actualValue.description}` : '';

  const tag = (
    <Tag type={colorMap[actualValue.code] ?? 'gray'} size="md">
      {displayText}
    </Tag>
  );

  return tooltipLabel ? (
    <Tooltip label={tooltipLabel} align="top" autoAlign>
      {tag}
    </Tooltip>
  ) : (
    tag
  );
};

export default ColorTag;
