import { DefinitionTooltip } from '@carbon/react';
import { type FC } from 'react';

import RedirectLinkTag from '@/components/waste/RedirectLinkTag';

type TooltipRedirectLinkTagProps = {
  tooltip: string;
  text: string;
  url: string;
  sameTab?: boolean;
};

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
