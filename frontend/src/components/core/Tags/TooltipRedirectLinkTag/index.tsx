import { type FC } from 'react';

import RedirectLinkTag from '@/components/core/Tags/RedirectLinkTag';

type TooltipRedirectLinkTagProps = {
  tooltip: string;
  text: string;
  url: string;
  sameTab?: boolean;
  clearSearch?: boolean;
};

/**
 * Adds a tooltip description to a redirect link without introducing a nested
 * interactive control.
 *
 * The tooltip is forwarded to {@link RedirectLinkTag}, which attaches Carbon's
 * `<Tooltip>` directly to the rendered link. This keeps the link as the only
 * interactive element (no wrapping `button.cds--definition-term`) and exposes
 * the description to assistive technology via `aria-describedby`.
 *
 * @param props The tooltip-link props.
 * @param props.tooltip Tooltip text shown on hover/focus.
 * @param props.text The link text.
 * @param props.url The target URL.
 * @param props.sameTab When true, opens the URL in the current tab.
 * @param props.clearSearch When true, resets search params for internal navigation.
 * @returns A redirect link with an accessible tooltip description.
 */
const TooltipRedirectLinkTag: FC<TooltipRedirectLinkTagProps> = ({
  tooltip,
  text,
  url,
  sameTab,
  clearSearch,
}) => {
  return (
    <RedirectLinkTag
      text={text}
      url={url}
      sameTab={sameTab}
      clearSearch={clearSearch}
      tooltip={tooltip}
    />
  );
};

export default TooltipRedirectLinkTag;
