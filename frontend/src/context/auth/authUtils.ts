import { env } from '@/env';

import {
  AVAILABLE_ROLES,
  validIdpProviders,
  type FamLoginUser,
  type IdpProviderType,
  type JWT,
  type ROLE_TYPE,
  type USER_PRIVILEGE_TYPE,
} from './types';

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
  return {
    userName,
    displayName,
    email,
    idpProvider,
    privileges: parsePrivileges(cognitoGroups),
    firstName: sanitizedFirstName,
    lastName,
    providerUsername: `${idpProvider}\\${userName}`,
  };
};

/**
 * Parses Cognito group strings into a user privilege object.
 * @param {string[]} input - Array of group strings from Cognito.
 * @returns {USER_PRIVILEGE_TYPE} The parsed privilege object.
 */
export function parsePrivileges(input: string[]): USER_PRIVILEGE_TYPE {
  const result: USER_PRIVILEGE_TYPE = {};
  for (const item of input) {
    const parts = item.split('_');
    const last = parts[parts.length - 1] ?? '';
    const isNumeric = last !== '' && Number.isFinite(Number(last));
    if (isNumeric) {
      const roleName = parts.slice(0, -1).join('_');
      if (AVAILABLE_ROLES.includes(roleName as ROLE_TYPE)) {
        const role = roleName as ROLE_TYPE;
        if (!result[role]) result[role] = [];
        (result[role] as string[]).push(last);
      }
    } else {
      if (AVAILABLE_ROLES.includes(item as ROLE_TYPE)) {
        result[item as ROLE_TYPE] = null;
      }
    }
  }
  return result;
}

/**
 * Extracts Cognito groups from a decoded JWT payload.
 * @param {object | undefined} decodedIdToken - The decoded JWT payload.
 * @returns {string[]} Array of group strings, or empty array if none found.
 */
export function extractGroups(decodedIdToken: object | undefined): string[] {
  if (!decodedIdToken) return [];
  if ('cognito:groups' in decodedIdToken) {
    return decodedIdToken['cognito:groups'] as string[];
  }
  return [];
}
