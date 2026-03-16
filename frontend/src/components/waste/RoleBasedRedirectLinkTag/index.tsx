import { type FC, useEffect } from 'react';

import type { Role } from '@/context/auth/types';

import RedirectLinkTag from '@/components/waste/RedirectLinkTag';
import { useAuth } from '@/context/auth/useAuth';

type RoleBasedRedirectLinkTagProps = {
  text: string;
  url: string;
  allowedRoles: Role[];
  sameTab?: boolean;
  onRenderStateChange?: (isLink: boolean) => void;
};

/**
 * Renders a link only when the current user has one of the allowed roles.
 *
 * @param props The role-based link props.
 * @param props.text The display text.
 * @param props.url The target URL.
 * @param props.allowedRoles Roles allowed to see the link.
 * @param props.sameTab When true, opens the URL in the current tab.
 * @param props.onRenderStateChange Optional callback with the current link visibility state.
 * @returns A link for authorized users or plain text otherwise.
 */
const RoleBasedRedirectLinkTag: FC<RoleBasedRedirectLinkTagProps> = ({
  text,
  url,
  sameTab,
  allowedRoles,
  onRenderStateChange,
}) => {
  const { user } = useAuth();

  const userRoles = user?.roles ?? [];
  const allowedRoleNames = new Set(allowedRoles);
  const isUserAllowed = userRoles.some((userRole) => allowedRoleNames.has(userRole.role));

  useEffect(() => {
    onRenderStateChange?.(isUserAllowed);
  }, [isUserAllowed, onRenderStateChange]);

  if (isUserAllowed) {
    return <RedirectLinkTag text={text} url={url} sameTab={sameTab} />;
  }

  return <span>{text}</span>;
};

export default RoleBasedRedirectLinkTag;
