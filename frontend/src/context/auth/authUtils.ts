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
 * Parses role names into the privilege map consumed by access checks.
 *
 * Roles arrive as bare application codes (`WASTE_PLUS_ADMIN`) or scope-
 * suffixed names (`WASTE_PLUS_VIEWER_00147603`); the numeric suffix carries
 * the scoped value (legacy client number).
 *
 * @param input Application role names with the FAM bookkeeping entries removed.
 * @returns The privilege map keyed by user-facing role label.
 */
function parsePrivileges(input: string[]): USER_PRIVILEGE_TYPE {
  const result: USER_PRIVILEGE_TYPE = {};
  const knownPrefix = 'WASTE_PLUS_';
  for (const item of input) {
    const normalized = item.toUpperCase().startsWith(knownPrefix)
      ? item.toUpperCase().slice(knownPrefix.length)
      : item.toUpperCase();
    const parts = normalized.split('_');
    const last = parts.at(-1) ?? '';
    const isNumeric = last !== '' && Number.isFinite(Number(last));
    if (isNumeric) {
      const roleName = parts.slice(0, -1).join('_');
      if (AVAILABLE_ROLES.map((role) => role.toUpperCase()).includes(roleName as ROLE_TYPE)) {
        const role = roleName as ROLE_TYPE;
        result[role] ??= [];
        result[role].push(last);
      }
    } else if (
      AVAILABLE_ROLES.map((role) => role.toUpperCase()).includes(normalized as ROLE_TYPE)
    ) {
      result[normalized as ROLE_TYPE] = null;
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
  const knownPrefix = 'WASTE_PLUS_';

  for (const entry of roles) {
    const normalized = entry.toUpperCase().startsWith(knownPrefix)
      ? entry.toUpperCase().slice(knownPrefix.length)
      : entry.toUpperCase();

    const [rolePart, clientId] = normalized.split('_');
    const role = rolePart.toUpperCase() as Role;

    if (!Object.values(Role).includes(role)) continue;

    if (!roleMap.has(role)) {
      roleMap.set(role, new Set());
    }

    if (clientId) {
      roleMap.get(role)?.add(clientId);
    }
  }

  return Array.from(roleMap.entries()).map(([role, clientSet]) => ({
    role,
    clients: Array.from(clientSet),
  }));
}
