import { DefinitionTooltip } from '@carbon/react';
import { type FC } from 'react';

import RedirectLinkTag from '@/components/waste/RedirectLinkTag';

type TolltipRedirectLinkTagProps = {
  tooltip: string;
  text: string;
  url: string;
  sameTab?: boolean;
};

const TolltipRedirectLinkTag: FC<TolltipRedirectLinkTagProps> = ({
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

export default TolltipRedirectLinkTag;
