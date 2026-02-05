import { DefinitionTooltip } from '@carbon/react';
import { type FC, useState } from 'react';

import type { Role } from '@/context/auth/types';

import RoleBasedRedirectLinkTag from '@/components/waste/RoleBasedRedirectLinkTag';

type TooltipRoleBasedRedirectLinkTagProps = {
  tooltip: string;
  text: string;
  url: string;
  allowedRoles: Role[];
  sameTab?: boolean;
};

const TooltipRoleBasedRedirectLinkTag: FC<TooltipRoleBasedRedirectLinkTagProps> = ({
  tooltip,
  text,
  url,
  allowedRoles,
  sameTab,
}) => {
  const [isLinkRendered, setIsLinkRendered] = useState(false);

  const roleBasedLink = (
    <RoleBasedRedirectLinkTag
      text={text}
      url={url}
      sameTab={sameTab}
      allowedRoles={allowedRoles}
      onRenderStateChange={setIsLinkRendered}
    />
  );

  if (!isLinkRendered) {
    return roleBasedLink;
  }

  return (
    <DefinitionTooltip definition={tooltip} align="top" openOnHover>
      {roleBasedLink}
    </DefinitionTooltip>
  );
};

export default TooltipRoleBasedRedirectLinkTag;
