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

const ColorTag: FC<ColorTagProps> = ({ value, colorMap }) => (
  <Tooltip label={`${value.code} - ${value.description}`} align="top" autoAlign>
    <Tag type={colorMap[value.code] ?? 'gray'} size="md">
      {value.description}
    </Tag>
  </Tooltip>
);

export default ColorTag;
