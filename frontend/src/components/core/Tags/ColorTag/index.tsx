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
  // Check if value is null or if both code and description are null/empty
  const hasCode = Boolean(value?.code?.trim());
  const hasDescription = Boolean(value?.description?.trim());
  const shouldUseDefault = !value || (!hasCode && !hasDescription);

  // If value is null or both code and description are null/empty, default to N/A
  const actualValue = shouldUseDefault ? { code: 'N/A', description: 'Not Applicable' } : value;

  const finalHasCode = Boolean(actualValue.code?.trim());
  const finalHasDescription = Boolean(actualValue.description?.trim());

  // Apply sentence case only for multiple word content
  const sentenceCase = (str: string): string => {
    // Single word: keep as-is
    if (!str.includes(' ')) {
      return str;
    }
    // Multiple words: capitalize first letter, lowercase the rest
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  };

  const displayText = finalHasDescription ? sentenceCase(actualValue.description) : '-';

  // Determine tooltip: show if we have both code and description
  const tooltipLabel =
    finalHasCode && finalHasDescription ? `${actualValue.code} - ${actualValue.description}` : '';

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
