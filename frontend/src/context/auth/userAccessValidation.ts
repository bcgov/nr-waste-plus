import { Role, RoleType, roleTypeMap, type FamLoginUser, type FamRole } from './types';

export const NO_ROLE_PATH = '/no-role';
export const UNAUTHORIZED_PATH = '/unauthorized';

export const accessViolationMessages = {
  IDIR_MULTIPLE_ROLES: 'This account is not permitted to have multiple roles.',
  BCEID_ASSIGNED_ROLES: 'This account is not permitted to have assigned roles.',
  CONFLICTING_CLIENT_ACCESS_ROLES: 'This account has conflicting client access roles',
  CLIENT_ACCESS_REQUIRES_CLIENT: 'This account requires at least one client',
} as const;

export type AccessViolationCode = keyof typeof accessViolationMessages;

export type AccessStatus =
  | {
      kind: 'allowed';
    }
  | {
      kind: 'no-role';
      redirectTo: typeof NO_ROLE_PATH;
    }
  | {
      kind: 'role-error';
      code: AccessViolationCode;
      message: (typeof accessViolationMessages)[AccessViolationCode];
      redirectTo: string;
    };

const PROVIDER_ROLES = new Set<Role>([Role.IDIR, Role.BCeID]);
const BCEID_FORBIDDEN_ROLES = new Set<Role>([Role.ADMIN, Role.AREA, Role.DISTRICT]);

const normalizeClients = (role: FamRole): string[] => {
  return role.clients.map((client) => client.trim()).filter(Boolean);
};

export const getAssignedRoles = (user: FamLoginUser | null | undefined): FamRole[] => {
  return (user?.roles ?? []).filter((role) => !PROVIDER_ROLES.has(role.role));
};

const buildUnauthorizedPath = (code: AccessViolationCode): string => {
  return `${UNAUTHORIZED_PATH}?reason=${encodeURIComponent(code)}`;
};

export const getUserAccessStatus = (user: FamLoginUser | null | undefined): AccessStatus => {
  const assignedRoles = getAssignedRoles(user);

  if (assignedRoles.length === 0) {
    return {
      kind: 'no-role',
      redirectTo: NO_ROLE_PATH,
    };
  }

  if (user?.idpProvider === 'IDIR' && assignedRoles.length > 1) {
    const code = 'IDIR_MULTIPLE_ROLES';
    return {
      kind: 'role-error',
      code,
      message: accessViolationMessages[code],
      redirectTo: buildUnauthorizedPath(code),
    };
  }

  if (
    user?.idpProvider === 'BCEIDBUSINESS' &&
    assignedRoles.some((role) => BCEID_FORBIDDEN_ROLES.has(role.role))
  ) {
    const code = 'BCEID_ASSIGNED_ROLES';
    return {
      kind: 'role-error',
      code,
      message: accessViolationMessages[code],
      redirectTo: buildUnauthorizedPath(code),
    };
  }

  const viewerRole = assignedRoles.find((role) => role.role === Role.VIEWER);
  const submitterRole = assignedRoles.find((role) => role.role === Role.SUBMITTER);
  const abstractRoles = assignedRoles.filter(
    (role) => roleTypeMap[role.role] === RoleType.ABSTRACT,
  );

  if (abstractRoles.some((role) => normalizeClients(role).length === 0)) {
    const code = 'CLIENT_ACCESS_REQUIRES_CLIENT';
    return {
      kind: 'role-error',
      code,
      message: accessViolationMessages[code],
      redirectTo: buildUnauthorizedPath(code),
    };
  }

  if (viewerRole && submitterRole) {
    const viewerClients = new Set(normalizeClients(viewerRole));
    const hasSharedClient = normalizeClients(submitterRole).some((client) =>
      viewerClients.has(client),
    );

    if (hasSharedClient) {
      const code = 'CONFLICTING_CLIENT_ACCESS_ROLES';
      return {
        kind: 'role-error',
        code,
        message: accessViolationMessages[code],
        redirectTo: buildUnauthorizedPath(code),
      };
    }
  }

  return {
    kind: 'allowed',
  };
};

export const getAccessViolationMessage = (code: string | null | undefined): string | undefined => {
  if (!code) return undefined;
  if (code in accessViolationMessages) {
    return accessViolationMessages[code as AccessViolationCode];
  }
  return undefined;
};
