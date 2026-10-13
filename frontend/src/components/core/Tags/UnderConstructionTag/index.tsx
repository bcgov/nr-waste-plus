import { Construction } from '@carbon/icons-react';
import { Tag } from '@carbon/react';
import { type FC, useEffect, useState } from 'react';

import TooltipTag from '@/components/core/Tags/TooltipTag';
import './index.scss';

export type UnderConstructionTagProps = {
  type?: 'page' | 'feature';
};

/**
 * A reusable tag component that displays an "Under construction" label with a tooltip.
 *
 * Useful for indicating that a specific page or feature is still in development.
 * The label doubles as a polite live region: the region mounts empty and the
 * text is inserted after registration, because a live region created together
 * with its text is not announced by screen readers.
 *
 * @param {UnderConstructionTagProps} props - Component props
 * @param {'page' | 'feature'} [props.type='feature'] - Indicates whether the tag applies to a page or a feature
 *
 * @returns {JSX.Element} A styled tag wrapped in a tooltip
 */
const UnderConstructionTag: FC<UnderConstructionTagProps> = ({ type = 'feature' }) => {
  const [label, setLabel] = useState('');

  useEffect(() => {
    // Defer the insert until after the empty region has painted so assistive
    // technology registers it before the text arrives; a live region created
    // together with its text is not announced.
    const timer = window.setTimeout(() => setLabel('Under construction'), 0);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <TooltipTag
      tooltip={`This ${type} is under development. Features may be incomplete or display incorrect data.`}
      align="bottom"
    >
      <span role="status" aria-live="polite">
        <Tag className="under-construction-tag" type="cyan" size="md" renderIcon={Construction}>
          {label}
        </Tag>
      </span>
    </TooltipTag>
  );
};

export default UnderConstructionTag;
