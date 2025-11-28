import { Tag, Tooltip } from '@carbon/react';
import { type FC } from 'react';

import './index.scss';

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

type ColorTagProps = {
  value: { code: string; description: string };
  colorMap: Record<string, CarbonColors>;
};

const ColorTag: FC<ColorTagProps> = ({ value, colorMap }) => {
  const hasCode = value.code !== null && value.code !== undefined && value.code !== '';
  const hasDescription =
    value.description !== null && value.description !== undefined && value.description !== '';

  const tooltipLabel =
    hasCode && hasDescription
      ? `${value.code} - ${value.description}`
      : hasCode
        ? value.code
        : hasDescription
          ? value.description
          : '';

  const displayText = hasDescription ? value.description : '-';
  const hasTooltipContent = hasCode || hasDescription;

  const tag = (
    <Tag type={colorMap[value.code] ?? 'gray'} size="md">
      {displayText}
    </Tag>
  );

  return hasTooltipContent ? (
    <Tooltip label={tooltipLabel} align="top" autoAlign>
      {tag}
    </Tooltip>
  ) : (
    tag
  );
};

export default ColorTag;
