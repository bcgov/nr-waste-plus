import type { JWT as AmplifyJWT } from '@aws-amplify/core';

export type JWT = AmplifyJWT;

export const AVAILABLE_ROLES = ['Viewer', 'Submitter', 'District', 'Area', 'Admin'] as const;

export type ROLE_TYPE = (typeof AVAILABLE_ROLES)[number];

type RoleValue = string[] | null;

export type USER_PRIVILEGE_TYPE = Partial<Record<ROLE_TYPE, RoleValue>>;

export const validIdpProviders = ['IDIR', 'BCEIDBUSINESS'] as const;

export type IdpProviderType = (typeof validIdpProviders)[number];

export enum RoleType {
  CONCRETE = 'CONCRETE',
  ABSTRACT = 'ABSTRACT',
}

export enum Role {
  VIEWER = 'VIEWER',
  SUBMITTER = 'SUBMITTER',
  DISTRICT = 'DISTRICT',
  AREA = 'AREA',
  ADMIN = 'ADMIN',
  IDIR = 'IDIR',
  BCeID = 'BCeID',
}

export const roleTypeMap: Record<Role, RoleType> = {
  [Role.VIEWER]: RoleType.ABSTRACT,
  [Role.SUBMITTER]: RoleType.ABSTRACT,
  [Role.DISTRICT]: RoleType.CONCRETE,
  [Role.AREA]: RoleType.CONCRETE,
  [Role.ADMIN]: RoleType.CONCRETE,
  [Role.IDIR]: RoleType.CONCRETE,
  [Role.BCeID]: RoleType.CONCRETE,
};

export type FamRole = {
  role: Role;
  clients: string[];
};

export type FamLoginUser = {
  providerUsername?: string;
  userName?: string;
  displayName?: string;
  email?: string;
  idpProvider?: IdpProviderType;
  roles?: FamRole[];
  authToken?: string;
  exp?: number;
  privileges: USER_PRIVILEGE_TYPE;
  firstName?: string;
  lastName?: string;
};
