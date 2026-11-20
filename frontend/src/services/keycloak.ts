import { UserManager, WebStorageStateStore, type User } from 'oidc-client-ts';

import { env } from '@/env';
import { type IdpProviderType } from '@/types/auth.types';

/**
 * Seconds before `expiresAt` at which a stored user is considered stale and
 * silently renewed. Keycloak's standard realm refresh token lives 30 minutes;
 * the margin keeps a renewal from racing the API round-trip that triggers it.
 */
const RENEWAL_MARGIN_SECONDS = 60;

/**
 * Query parameter value handed to the standard realm for each login button.
 * The realm only honours hints for brokers bound to the client integration;
 * an unbound hint is silently ignored, so these values must match the CSS
 * console broker aliases exactly (verified by the S0 realm probes).
 */
const IDP_HINT_BY_PROVIDER: Record<IdpProviderType, string> = {
  IDIR: 'azureidir',
  BCEIDBUSINESS: 'bceidbusiness',
};

/**
 * Scopes requested at the authorization endpoint. The `roles` scope is NOT
 * valid on this integration — requesting it fails the whole authorization
 * request with `invalid_scope`; application roles arrive in the top-level
 * `client_roles` token claim instead.
 */
const OIDC_SCOPES = 'openid profile email';

/**
 * Lazily constructed `UserManager` singleton. Created on first use rather
 * than at module load — no OIDC machinery boots until the app needs it.
 */
let userManager: UserManager | undefined;

/**
 * Builds the local mock-authority URL used when `VITE_MOCK_AUTH` is enabled:
 * the backend host rewritten to the local WireMock port, pointing at the
 * emulated standard realm.
 *
 * @returns The mock realm issuer URL.
 */
const buildMockAuthority = (): string => {
  const host = env.VITE_BACKEND_URL.replace(/^https?:\/\//, '').replace(':8080', ':8181');
  return `http://${host}/realms/standard`;
};

/**
 * Resolves the OIDC authority (realm issuer URL) for the current mode.
 *
 * @returns The realm issuer URL; the local mock realm in mock-auth mode.
 */
const resolveAuthority = (): string =>
  env.VITE_MOCK_AUTH === 'true' ? buildMockAuthority() : env.VITE_KEYCLOAK_URL;

/**
 * Derives the sign-in redirect URI from the current origin so a single built
 * image serves every environment (PR previews, TEST, PROD).
 *
 * @returns The absolute `/authCallback` URL for the current origin.
 */
const buildRedirectUri = (): string =>
  new URL('/authCallback', globalThis.location.origin).toString();

/**
 * Derives the post-logout redirect URI from the current origin.
 *
 * @returns The absolute application root URL for the current origin.
 */
const buildPostLogoutRedirectUri = (): string =>
  new URL('/', globalThis.location.origin).toString();

/**
 * Returns the shared {@link UserManager}, creating it on first call.
 *
 * Tokens live in `sessionStorage` (they die with the tab, matching the
 * previous cookie lifetime). **Mock-auth builds read from `localStorage`
 * instead**: Playwright's `storageState` captures localStorage but never
 * sessionStorage, so the e2e harness can only seed sessions through
 * localStorage. `VITE_MOCK_AUTH=true` never reaches a deployed build, so the
 * sessionStorage guarantee holds everywhere the app actually ships.
 *
 * Silent renew is manual — the auth provider drives renewal through
 * {@link ensureFreshUser} on its refresh cadence.
 *
 * @returns The process-wide user manager.
 */
export const getUserManager = (): UserManager => {
  const isMock = env.VITE_MOCK_AUTH === 'true';
  userManager ??= new UserManager({
    authority: resolveAuthority(),
    client_id: env.VITE_KEYCLOAK_CLIENT_ID,
    redirect_uri: buildRedirectUri(),
    post_logout_redirect_uri: buildPostLogoutRedirectUri(),
    scope: OIDC_SCOPES,
    response_type: 'code',
    userStore: new WebStorageStateStore({
      store: isMock ? globalThis.localStorage : globalThis.sessionStorage,
    }),
    automaticSilentRenew: false,
  });
  return userManager;
};

/**
 * Reads the stored OIDC user without triggering renewal. Used by the auth
 * provider to schedule renewal at the token's actual expiry and to decide
 * whether an idle user's session should lapse.
 *
 * @returns The stored user, or `null` when there is no session.
 */
export const getStoredUser = async (): Promise<User | null> => getUserManager().getUser();

/**
 * Determines whether the stored user's access token is expired or inside the
 * renewal margin.
 *
 * @param user The stored OIDC user, if any.
 * @returns `true` when the user exists but needs a silent renewal.
 */
export const needsRenewal = (user: User | null | undefined): boolean => {
  if (!user) return false;
  if (user.expired) return true;
  const expiresAt = user.expires_at ?? Number.MAX_SAFE_INTEGER;
  return expiresAt - Date.now() / 1000 < RENEWAL_MARGIN_SECONDS;
};

/**
 * Renews the session from the stored refresh token.
 *
 * @returns The renewed user, or `null` when the session cannot be renewed.
 */
export const forceRenew = async (): Promise<User | null> => {
  try {
    return await getUserManager().signinSilent();
  } catch {
    return null;
  }
};

/**
 * Returns the stored user, renewing it first when it is expired or close to
 * expiry. This is the single entry point the auth provider and API layer use
 * before reading token material.
 *
 * @returns The current user, or `null` when no session exists.
 */
export const ensureFreshUser = async (): Promise<User | null> => {
  const user = await getUserManager().getUser();
  if (!user) return null;
  if (needsRenewal(user)) {
    return forceRenew();
  }
  return user;
};

/**
 * Starts the authorization-code + PKCE sign-in redirect for the chosen
 * identity provider. The realm broker is selected per call — never baked into
 * the manager settings — so each login button carries its own hint.
 *
 * @param provider The identity provider chosen on the landing page.
 */
export const signIn = async (provider: IdpProviderType): Promise<void> => {
  await getUserManager().signinRedirect({
    extraQueryParams: { kc_idp_hint: IDP_HINT_BY_PROVIDER[provider] },
  });
};

/**
 * Completes the authorization-code exchange on the `/authCallback` route.
 *
 * @returns The signed-in user, or `undefined` when the callback carried no
 * session (for example after a provider error redirect).
 */
export const completeSignIn = async (): Promise<User | undefined> => {
  return getUserManager().signinCallback();
};

/**
 * Signs the user out through the realm's end-session endpoint.
 *
 * The stored user must NOT be removed first: `oidc-client-ts` reads the
 * `id_token_hint` off it, and a logout the realm cannot attribute leaves the
 * realm session alive so the next sign-in skips the prompt. Local cleanup is
 * the caller's fallback when this redirect fails.
 */
export const signOut = async (): Promise<void> => {
  await getUserManager().signoutRedirect();
};

/**
 * Removes the stored user locally without contacting the realm. Fallback
 * cleanup only — the realm session it leaves behind is acceptable only when
 * the attributed redirect has already failed.
 */
export const removeUserLocally = async (): Promise<void> => {
  await getUserManager().removeUser();
};

/**
 * Returns the current user's access token for API authorization.
 *
 * @returns The access token, or `undefined` when no session exists.
 */
export const getUserAccessToken = async (): Promise<string | undefined> => {
  const user = await getUserManager().getUser();
  return user?.access_token;
};
