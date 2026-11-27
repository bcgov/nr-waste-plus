import {
  AVAILABLE_ROLES,
  Role,
  type FamLoginUser,
  type FamRole,
  type IdpProviderType,
  type ROLE_TYPE,
  type USER_PRIVILEGE_TYPE,
} from '@/types/auth.types';

/**
 * Role-claim entries carrying this prefix are FAM per-grant expiry
 * bookkeeping (for example `FAM:EXPIRES:2026-09-30:WASTE_PLUS_ADMIN`) and
 * never represent an application authority.
 */
const FAM_BOOKKEEPING_PREFIX = 'FAM:';

/**
 * Claim that carries the CSS-era role assignments on the access token.
 */
const CLIENT_ROLES_CLAIM = 'client_roles';

/**
 * Token claim holding the broker name the user authenticated through.
 */
const IDENTITY_PROVIDER_CLAIM = 'identity_provider';

/**
 * Maps a raw identity-provider claim value to the application's provider
 * label. The IDIR-MFA broker federates through Azure AD, so the realm reports
 * `azureidir`; every IDIR alias normalizes to the same label the UI already
 * uses.
 *
 * @param value The raw `identity_provider` claim value.
 * @returns The normalized provider label, or `undefined` when unrecognized.
 */
const normalizeIdpProvider = (value: unknown): IdpProviderType | undefined => {
  const provider = (typeof value === 'string' ? value : '').toLowerCase();
  if (provider === 'azureidir' || provider === 'idir') return 'IDIR';
  if (provider === 'bceidbusiness') return 'BCEIDBUSINESS';
  return undefined;
};

/**
 * Extracts the role-claim string list from decoded token claims, dropping FAM
 * bookkeeping entries.
 *
 * @param claims Decoded token claims.
 * @returns Application role names; empty when the claim is absent or malformed.
 */
const extractClientRoles = (claims: Record<string, unknown> | undefined): string[] => {
  const raw = claims?.[CLIENT_ROLES_CLAIM];
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (entry): entry is string => typeof entry === 'string' && !entry.startsWith(FAM_BOOKKEEPING_PREFIX),
  );
};

/**
 * Parses decoded token claims and returns a FamLoginUser object if valid.
 *
 * Reads the Keycloak claim set (`identity_provider`, `idir_username`,
 * `display_name`, `email`, `client_roles`); the legacy Cognito
 * `custom:idp_name` claim is honoured only to keep the provider label
 * resolvable for tokens minted before the cutover.
 *
 * @param claims Decoded token claims (access-token payload merged over the ID-token profile).
 * @returns The parsed user object, or undefined when claims are absent.
 */
export const parseToken = (claims: Record<string, unknown> | undefined): FamLoginUser | undefined => {
  if (!claims) return undefined;
  const displayName = (claims['display_name'] as string) || '';
  const idpProvider = normalizeIdpProvider(claims[IDENTITY_PROVIDER_CLAIM]);
  const hasComma = displayName.includes(',');
  let [lastName, firstName] = hasComma ? displayName.split(', ') : displayName.split(' ');
  if (!hasComma) [lastName, firstName] = [firstName, lastName];
  const sanitizedFirstName = hasComma ? firstName?.split(' ')[0]?.trim() : firstName || '';
  const userName = (claims['idir_username'] as string) || '';
  const email = (claims['email'] as string) || '';
  const clientRoles = extractClientRoles(claims);
  const roles = extractRoles(clientRoles);
  roles.push(
    idpProvider === 'IDIR' ? { role: Role.IDIR, clients: [] } : { role: Role.BCeID, clients: [] },
  );

  return {
    userName,
    displayName,
    email,
    idpProvider,
    privileges: parsePrivileges(clientRoles),
    firstName: sanitizedFirstName,
    lastName,
    providerUsername: `${idpProvider}\\${userName}`,
    roles,
  };
};

/**
 * Prefix marking application role names in a CSS token.
 */
const WASTE_PLUS_PREFIX = 'WASTE_PLUS_';

/**
 * FAM client-scope name carried in role suffixes, for example the
 * `FOREST_CLIENT-00001271` portion of
 * `WASTE_PLUS_SUBMITTER_FOREST_CLIENT-00001271`.
 */
const FAM_CLIENT_PREFIX = 'FOREST_CLIENT';

/**
 * Numeric client numbers are the only valid scoped privilege values.
 */
const NUMERIC_CLIENT = /^\d+$/;

/**
 * Splits a role name into its application role and optional scope suffix.
 *
 * Only the first underscore separates them: a FAM scope contains an
 * underscore of its own (`FOREST_CLIENT-00001271`), so splitting on every
 * underscore would truncate the suffix.
 *
 * @param entry Role name from the token, with or without `WASTE_PLUS_`.
 * @returns The uppercased role name and, when present, the uppercased suffix.
 */
const splitRoleAssignment = (entry: string): { roleName: string; suffix?: string } => {
  const uppercased = entry.toUpperCase();
  const normalized = uppercased.startsWith(WASTE_PLUS_PREFIX)
    ? uppercased.slice(WASTE_PLUS_PREFIX.length)
    : uppercased;
  const separatorIndex = normalized.indexOf('_');
  if (separatorIndex === -1) return { roleName: normalized };
  return {
    roleName: normalized.slice(0, separatorIndex),
    suffix: normalized.slice(separatorIndex + 1),
  };
};

/**
 * Reduces a FAM client scope to its bare client number while leaving legacy
 * suffixes alone.
 *
 * `FOREST_CLIENT-00001271` and `FOREST_CLIENT_00001271` both become
 * `00001271`; `00001271` and district codes such as `DKM` are returned
 * unchanged. A FAM scope with a missing or non-numeric client yields no
 * client so scoping never invents one from a malformed role name.
 *
 * @param suffix Role-name portion after the application role.
 * @returns The client number, or undefined when a FAM scope has no usable client.
 */
const normalizeClientSuffix = (suffix: string): string | undefined => {
  const normalized = suffix.toUpperCase();
  if (normalized === '' || normalized === FAM_CLIENT_PREFIX) return undefined;
  for (const delimiter of ['-', '_']) {
    const famPrefix = `${FAM_CLIENT_PREFIX}${delimiter}`;
    if (normalized.startsWith(famPrefix)) {
      const clientNumber = normalized.slice(famPrefix.length);
      return NUMERIC_CLIENT.test(clientNumber) ? clientNumber : undefined;
    }
  }
  return normalized;
};

/**
 * Parses role names into the privilege map consumed by access checks.
 *
 * Roles arrive as bare application codes (`WASTE_PLUS_ADMIN`) or scope-
 * suffixed names (`WASTE_PLUS_VIEWER_00147603`,
 * `WASTE_PLUS_SUBMITTER_FOREST_CLIENT-00001271`); the scoped value is a
 * numeric client number.
 *
 * @param input Application role names with the FAM bookkeeping entries removed.
 * @returns The privilege map keyed by user-facing role label.
 */
function parsePrivileges(input: string[]): USER_PRIVILEGE_TYPE {
  const result: USER_PRIVILEGE_TYPE = {};
  const knownRoles = AVAILABLE_ROLES.map((role) => role.toUpperCase());
  for (const item of input) {
    const { roleName, suffix } = splitRoleAssignment(item);
    if (!knownRoles.includes(roleName as ROLE_TYPE)) continue;
    const role = roleName as ROLE_TYPE;
    const client = suffix === undefined ? undefined : normalizeClientSuffix(suffix);
    if (client !== undefined && NUMERIC_CLIENT.test(client)) {
      const existing = result[role];
      if (Array.isArray(existing)) {
        existing.push(client);
      } else {
        result[role] = [client];
      }
    } else if (suffix === undefined) {
      result[role] = null;
    }
  }
  return result;
}

/**
 * Groups application role names into {@link FamRole} assignments with their
 * scoped client values.
 *
 * @param roles Application role names with the FAM bookkeeping entries removed.
 * @returns One entry per role, each carrying the distinct scoped client values.
 */
function extractRoles(roles: string[]): FamRole[] {
  const roleMap = new Map<Role, Set<string>>();

  for (const entry of roles) {
    const { roleName, suffix } = splitRoleAssignment(entry);
    const role = roleName as Role;

    if (!Object.values(Role).includes(role)) continue;

    if (!roleMap.has(role)) {
      roleMap.set(role, new Set());
    }

    const client = suffix === undefined ? undefined : normalizeClientSuffix(suffix);
    if (client) {
      roleMap.get(role)?.add(client);
    }
  }

  return Array.from(roleMap.entries()).map(([role, clientSet]) => ({
    role,
    clients: Array.from(clientSet),
  }));
}
