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
