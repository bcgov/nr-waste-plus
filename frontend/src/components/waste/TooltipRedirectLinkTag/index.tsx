import { DefinitionTooltip } from '@carbon/react';
import { type FC } from 'react';

import RedirectLinkTag from '@/components/waste/RedirectLinkTag';

type TooltipRedirectLinkTagProps = {
  tooltip: string;
  text: string;
  url: string;
  sameTab?: boolean;
};

/**
 * Wraps a redirect link in a tooltip explanation.
 *
 * @param props The tooltip-link props.
 * @param props.tooltip Tooltip text shown on hover.
 * @param props.text The link text.
 * @param props.url The target URL.
 * @param props.sameTab When true, opens the URL in the current tab.
 * @returns A tooltip-wrapped redirect link.
 */
const TooltipRedirectLinkTag: FC<TooltipRedirectLinkTagProps> = ({
  tooltip,
  text,
  url,
  sameTab,
}) => {
  return (
    <DefinitionTooltip definition={tooltip} align="top" openOnHover>
      <RedirectLinkTag text={text} url={url} sameTab={sameTab} />
    </DefinitionTooltip>
  );
};

export default TooltipRedirectLinkTag;
