import {
  AVAILABLE_ROLES,
  Role,
  validIdpProviders,
  type FamLoginUser,
  type FamRole,
  type IdpProviderType,
  type JWT,
  type ROLE_TYPE,
  type USER_PRIVILEGE_TYPE,
} from './types';

import { env } from '@/env';

/**
 * Retrieves the value of a cookie by name.
 * @param {string} name - The name of the cookie to retrieve.
 * @returns {string} The cookie value, or an empty string if not found.
 */
export const getCookie = (name: string): string => {
  const cookie = document.cookie
    .split(';')
    .find((cookieValue) => cookieValue.trim().startsWith(name));
  return cookie ? (cookie.split('=')[1] ?? '') : '';
};

/**
 * Retrieves the Cognito idToken for the current user from cookies.
 * @returns {string | undefined} The idToken string, or undefined if not found.
 */
export const getUserTokenFromCookie = (): string | undefined => {
  const baseCookieName = `CognitoIdentityServiceProvider.${env.VITE_USER_POOLS_WEB_CLIENT_ID}`;
  const userId = encodeURIComponent(getCookie(`${baseCookieName}.LastAuthUser`));
  if (userId) {
    return getCookie(`${baseCookieName}.${userId}.idToken`);
  } else {
    return undefined;
  }
};

/**
 * Parses a JWT token and returns a FamLoginUser object if valid.
 * @param {JWT | undefined} idToken - The JWT token to parse.
 * @returns {FamLoginUser | undefined} The parsed user object, or undefined if invalid.
 */
export const parseToken = (idToken: JWT | undefined): FamLoginUser | undefined => {
  if (!idToken) return undefined;
  const decodedIdToken = idToken?.payload;
  const displayName = (decodedIdToken?.['custom:idp_display_name'] as string) || '';
  const idpProvider = validIdpProviders.includes(
    (decodedIdToken?.['custom:idp_name'] as string)?.toUpperCase() as IdpProviderType,
  )
    ? ((decodedIdToken?.['custom:idp_name'] as string).toUpperCase() as IdpProviderType)
    : undefined;
  const hasComma = displayName.includes(',');
  let [lastName, firstName] = hasComma ? displayName.split(', ') : displayName.split(' ');
  if (!hasComma) [lastName, firstName] = [firstName, lastName];
  const sanitizedFirstName = hasComma ? firstName?.split(' ')[0]?.trim() : firstName || '';
  const userName = (decodedIdToken?.['custom:idp_username'] as string) || '';
  const email = (decodedIdToken?.['email'] as string) || '';
  const cognitoGroups = extractGroups(decodedIdToken);
  const roles = extractRoles(cognitoGroups);
  roles.push(
    idpProvider === 'IDIR' ? { role: Role.IDIR, clients: [] } : { role: Role.BCeID, clients: [] },
  );

  return {
    userName,
    displayName,
    email,
    idpProvider,
    privileges: parsePrivileges(cognitoGroups),
    firstName: sanitizedFirstName,
    lastName,
    providerUsername: `${idpProvider}\\${userName}`,
    roles,
  };
};

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

function extractGroups(decodedIdToken: object | undefined): string[] {
  if (!decodedIdToken) return [];
  if ('cognito:groups' in decodedIdToken) {
    return decodedIdToken['cognito:groups'] as string[];
  }
  return [];
}

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
