import type { JWT as AmplifyJWT } from '@aws-amplify/core';

/**
 * Re-export of the Amplify JWT type used by the auth layer.
 */
export type JWT = AmplifyJWT;

/**
 * User-facing role labels supported by the application.
 */
export const AVAILABLE_ROLES = ['Viewer', 'Submitter', 'District', 'Area', 'Admin'] as const;

/**
 * Union of supported user-facing role labels.
 */
export type ROLE_TYPE = (typeof AVAILABLE_ROLES)[number];

type RoleValue = string[] | null;

/**
 * Mapping of user-facing roles to any scoped privilege values.
 */
export type USER_PRIVILEGE_TYPE = Partial<Record<ROLE_TYPE, RoleValue>>;

/**
 * Identity providers accepted by the authentication flow.
 */
export const validIdpProviders = ['IDIR', 'BCEIDBUSINESS'] as const;

/**
 * Union of supported identity provider names.
 */
export type IdpProviderType = (typeof validIdpProviders)[number];

/**
 * Distinguishes abstract roles from concrete, scoped roles.
 */
export enum RoleType {
  CONCRETE = 'CONCRETE',
  ABSTRACT = 'ABSTRACT',
}

/**
 * Canonical application roles derived from the authenticated user token.
 */
export enum Role {
  VIEWER = 'VIEWER',
  SUBMITTER = 'SUBMITTER',
  DISTRICT = 'DISTRICT',
  AREA = 'AREA',
  ADMIN = 'ADMIN',
  IDIR = 'IDIR',
  BCeID = 'BCeID',
}

/**
 * Maps application roles to their concrete or abstract classification.
 */
export const roleTypeMap: Record<Role, RoleType> = {
  [Role.VIEWER]: RoleType.ABSTRACT,
  [Role.SUBMITTER]: RoleType.ABSTRACT,
  [Role.DISTRICT]: RoleType.CONCRETE,
  [Role.AREA]: RoleType.CONCRETE,
  [Role.ADMIN]: RoleType.CONCRETE,
  [Role.IDIR]: RoleType.CONCRETE,
  [Role.BCeID]: RoleType.CONCRETE,
};

/**
 * A resolved role assignment for the authenticated user.
 */
export type FamRole = {
  role: Role;
  clients: string[];
};

/**
 * Normalized authenticated user payload used throughout the frontend.
 */
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
