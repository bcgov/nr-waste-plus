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

/**
 * Adds a tooltip to a role-gated redirect link only when the link is actually rendered.
 *
 * @param props The tooltip role-based link props.
 * @param props.tooltip Tooltip text shown on hover.
 * @param props.text The display text.
 * @param props.url The target URL.
 * @param props.allowedRoles Roles allowed to see the link.
 * @param props.sameTab When true, opens the URL in the current tab.
 * @returns A role-aware link with optional tooltip wrapping.
 */
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
