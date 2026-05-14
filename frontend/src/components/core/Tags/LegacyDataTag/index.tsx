import { Box } from '@carbon/icons-react';
import { Tag, Tooltip } from '@carbon/react';
import { type FC } from 'react';

import './index.scss';
import { env } from '@/env';

export type LegacyDataTagProps = {
  readonly url: string;
  readonly label?: string;
};

/**
 * A tag component that indicates data originated from a legacy system.
 *
 * Displays a tooltip with a message about the legacy data source and
 * renders as a clickable link to the source record in the legacy system.
 *
 * @param {LegacyDataTagProps} props - Component props
 * @param {string} props.url - The URL to the source record in the legacy system
 * @param {string} [props.label='Legacy data'] - Override the default tag label
 *
 * @returns {JSX.Element} A styled, linkable tag wrapped in a tooltip
 */
const LegacyDataTag: FC<LegacyDataTagProps> = ({ url, label = 'Legacy data' }) => {
  const finalUrl = `${env.VITE_LEGACY_BASE_URL}${url}`;

  const tag = (
    <Tag className="legacy-data-tag" type="purple" size="md" renderIcon={Box}>
      {label}
    </Tag>
  );

  return (
    <Tooltip
      label="This data originates from a legacy system. Click to view the source record."
      align="bottom"
    >
      <a
        href={finalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="legacy-data-tag__link"
      >
        {tag}
      </a>
    </Tooltip>
  );
};

export default LegacyDataTag;
