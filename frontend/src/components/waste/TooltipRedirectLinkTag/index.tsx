import { DefinitionTooltip } from '@carbon/react';
import { type FC } from 'react';

import RedirectLinkTag from '@/components/waste/RedirectLinkTag';

type TooltipRedirectLinkTagProps = {
  tooltip: string;
  text: string;
  url: string;
  sameTab?: boolean;
  clearSearch?: boolean;
};

/**
 * Wraps a redirect link in a tooltip explanation.
 *
 * @param props The tooltip-link props.
 * @param props.tooltip Tooltip text shown on hover.
 * @param props.text The link text.
 * @param props.url The target URL.
 * @param props.sameTab When true, opens the URL in the current tab.
 * @param props.clearSearch When true, resets search params for internal navigation.
 * @returns A tooltip-wrapped redirect link.
 */
const TooltipRedirectLinkTag: FC<TooltipRedirectLinkTagProps> = ({
  tooltip,
  text,
  url,
  sameTab,
  clearSearch,
}) => {
  return (
    <DefinitionTooltip definition={tooltip} align="top" openOnHover>
      <RedirectLinkTag text={text} url={url} sameTab={sameTab} clearSearch={clearSearch} />
    </DefinitionTooltip>
  );
};

export default TooltipRedirectLinkTag;
