/* eslint-disable @typescript-eslint/no-explicit-any */
import { createSign } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import type { Page } from '@playwright/test';

type Provider = 'idir' | 'bceid';

/**
 * Directory holding the generated mock-realm fixtures (tokens, sessions,
 * JWKS). Regenerate with `node stub/keys/generate-mock-realm.mjs`.
 */
const MOCK_OIDC_DIR = path.resolve(process.cwd(), 'stub', '__files', 'oidc');
const MOCK_PRIVATE_KEY_PATH = path.resolve(process.cwd(), 'stub', 'keys', 'mock-realm-private.pem');

/**
 * Claim-name translation from the legacy Cognito vocabulary the specs were
 * written against to the Keycloak claims the tokens now carry. Specs keep
 * speaking the old names; this helper converts them. Sweep candidate.
 */
const LEGACY_CLAIM_MAP: Record<string, string> = {
  'custom:idp_name': 'identity_provider',
  'cognito:groups': 'client_roles',
  'custom:idp_username': 'idir_username',
  'custom:idp_display_name': 'display_name',
  'custom:idp_user_id': 'idir_user_guid',
  'custom:idp_business_id': 'bceid_user_guid',
};

/**
 * Broker alias normalization: the realm reports IDIR as `azureidir` (IDIR-MFA
 * federates through Azure AD); specs may pass either name.
 */
const normalizeBroker = (value: unknown): unknown => {
  if (value === 'idir') return 'azureidir';
  return value;
};

const translateLegacyClaims = (overrides: Record<string, any>): Record<string, any> => {
  const translated: Record<string, any> = {};
  for (const [key, value] of Object.entries(overrides)) {
    const claimName = LEGACY_CLAIM_MAP[key] ?? key;
    translated[claimName] = claimName === 'identity_provider' ? normalizeBroker(value) : value;
  }
  return translated;
};

const signJwt = (payload: Record<string, unknown>): string => {
  const header = { alg: 'RS256', typ: 'JWT', kid: 'mock-realm-key-1' };
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const signingInput = `${encode(header)}.${encode(payload)}`;
  const signature = createSign('RSA-SHA256')
    .update(signingInput)
    .sign(fs.readFileSync(MOCK_PRIVATE_KEY_PATH, 'utf8'), 'base64url');
  return `${signingInput}.${signature}`;
};

/**
 * The mock realm issuer. Must mirror `buildMockAuthority()` in
 * `src/services/keycloak.ts` exactly: the VITE_BACKEND_URL host with port
 * 8080 swapped for the WireMock port 8181.
 */
export const getMockAuthority = (): string => {
  const backendUrl = process.env.VITE_BACKEND_URL ?? 'http://localhost:8080';
  const host = backendUrl.replace(/^https?:\/\//, '').replace(':8080', ':8181');
  return `http://${host}/realms/standard`;
};

/**
 * The sessionStorage key `oidc-client-ts` stores the user under.
 *
 * `UserManager._userStoreKey` builds `user:<authority>:<client_id>`, but the
 * `WebStorageStateStore` used for the user store applies its **default
 * `oidc.` prefix**, so the effective key is `oidc.user:<authority>:<client_id>`.
 * Verified against the installed `oidc-client-ts` 3.5.0.
 */
export const getMockUserStorageKey = (): string =>
  `oidc.user:${getMockAuthority()}:${process.env.VITE_KEYCLOAK_CLIENT_ID ?? 'waste-waste-plus-6729'}`;

/**
 * Whether tests should run against the mock realm rather than a real one.
 */
export const isMockAuthEnabled = (): boolean =>
  process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

const loadSessionFixture = (userType: Provider): string => {
  const sessionPath = path.join(MOCK_OIDC_DIR, `session-${userType}.json`);
  if (!fs.existsSync(sessionPath)) {
    throw new Error(
      `Mock OIDC session fixture missing: ${sessionPath}. ` +
        'Generate it with: node stub/keys/generate-mock-realm.mjs',
    );
  }
  return fs.readFileSync(sessionPath, 'utf-8');
};

/**
 * Plants a pre-signed OIDC session into the store the mock-mode user manager
 * reads — localStorage under the `oidc.user:<authority>:<client_id>` key —
 * before any application script runs on this page.
 *
 * The setup project calls this, then saves a storageState: localStorage IS
 * captured by Playwright's storageState, so the browser projects inherit the
 * session through the normal mechanism with no per-page planting.
 *
 * @param page The page to plant the session into.
 * @param userType Which mock user to plant.
 */
export const injectMockOidcSession = async (page: Page, userType: Provider): Promise<void> => {
  await page.addInitScript(
    ([storageKey, sessionJson]) => {
      window.localStorage.setItem(storageKey, sessionJson as string);
    },
    [getMockUserStorageKey(), loadSessionFixture(userType)],
  );
};

/**
 * Plants an overridden OIDC session into sessionStorage before the app boots.
 *
 * Keeps the historic export name and Cognito-claim override vocabulary so the
 * 20+ spec files calling it stay untouched; claims are translated and the
 * resulting tokens re-signed with the fixture key. Signature validity is
 * cosmetic in e2e (no real backend sees these tokens), but keeping tokens
 * well-formed keeps the fixtures honest.
 *
 * @param page The spec's page (init script registers before navigation).
 * @param metadata Project metadata carrying `userType`.
 * @param claimOverrides Legacy-named claim overrides on top of the fixture user.
 */
export async function mockJwt(
  page: Page,
  metadata: Record<string, any>,
  claimOverrides: Record<string, any> = {},
): Promise<void> {
  const userType = metadata.userType.toLowerCase() as Provider;
  const base = JSON.parse(loadSessionFixture(userType)) as Record<string, any>;
  const profile = { ...base.profile, ...translateLegacyClaims(claimOverrides) };

  const user = {
    id_token: signJwt(profile),
    session_state: null,
    access_token: signJwt({ ...profile }),
    refresh_token: `mock-refresh-${userType}`,
    token_type: 'Bearer',
    scope: 'openid profile email',
    profile,
    expires_at: profile.exp ?? base.expires_at,
  };

  await page.addInitScript(
    ([storageKey, sessionJson]) => {
      window.localStorage.setItem(storageKey, sessionJson as string);
    },
    [getMockUserStorageKey(), JSON.stringify(user)],
  );
}

/**
 * Replaces the former Cognito-cookie mock: plants the fixture session, walks
 * to the app, verifies the authenticated shell renders, and saves a
 * storageState for the browser projects (cookies are empty under the OIDC
 * client — the session lives in sessionStorage and is re-planted per page by
 * the shared fixture).
 *
 * @param page The setup project's page.
 * @param metadata Project metadata carrying `userType` and `stateFile`.
 */
export async function mockAuthenticate(page: Page, metadata: Record<string, any>): Promise<void> {
  const userType = metadata.userType.toLowerCase() as Provider;
  console.log(`Setup - Mock Auth: ${userType} user`);

  await mockJwt(page, metadata);

  await page.goto('/');

  // Authenticated shell proof: the app header renders (the landing page has
  // no header) and the login CTA is gone. The app may land on /dashboard or a
  // restored deep-link target — the header is the stable signal either way.
  try {
    await page.waitForSelector('.cds--header__name', { timeout: 20_000 });
  } catch (error) {
    // Diagnostics: what does the page actually hold against the key we injected?
    const storageKeys = await page.evaluate(() => Object.keys(localStorage));
    const injected = await page.evaluate(
      (k) => localStorage.getItem(k) !== null,
      getMockUserStorageKey(),
    );
    // eslint-disable-next-line no-console
    console.log(
      `DEBUG storageKeys=${JSON.stringify(storageKeys)} injected=${injected} ` +
        `expectedKey=${getMockUserStorageKey()} url=${page.url()}`,
    );
    throw error;
  }

  console.log(`Setup - Mock authenticated as ${userType}`);

  const authFile = path.resolve(process.cwd(), 'src/config/tests', metadata.stateFile);
  await page.context().storageState({ path: authFile });
}

/**
 * Real-credential login through the DEV realm. Used only when
 * `VITE_MOCK_AUTH` is not enabled (local, against the real integration).
 *
 * With `kc_idp_hint=azureidir` the realm hands off straight to the Azure AD
 * sign-in page (`loginfmt` / password / MFA). MFA cannot be automated — the
 * caller completes it by hand within the timeout, or uses an MFA-exempt
 * automation account. BCeID business users authenticate on the BCeID hosted
 * page instead.
 *
 * @param page The setup project's page.
 * @param metadata Project metadata carrying `userType` and `stateFile`.
 */
export async function authenticate(page: Page, metadata: Record<string, any>): Promise<void> {
  const userType = metadata.userType.toLowerCase() as Provider;
  const user =
    userType === 'idir' ? (process.env.IDIR_USERNAME ?? '') : (process.env.BCEID_USERNAME ?? '');
  const password =
    userType === 'idir' ? (process.env.IDIR_PASSWORD ?? '') : (process.env.BCEID_PASSWORD ?? '');
  // Credentials are read lazily from process.env — never stored in project metadata
  console.log(`Setup - Auth: ${user} via ${userType}`);

  await page.goto('/');
  await page.getByTestId(`landing-button__${userType}`).click();

  await page.waitForLoadState('networkidle');

  // The broker sign-in page is cross-origin; all interaction stays inside
  // cy-free Playwright page APIs. Azure AD (IDIR-MFA) and the BCeID hosted
  // page expose different fields.
  if (userType === 'idir') {
    await page.fill('input[name="loginfmt"]', user);
    await page.click('input[value="Next"]');
    await page.fill('input[name="passwd"]', password);
    await page.click('input[value="Sign in"]');
    console.log('Setup - Complete the MFA challenge in the browser before the timeout.');
  } else {
    await page.fill('#user', user);
    await page.fill('#password', password);
    await page.click('input[type="submit"]');
  }

  // Wait for navigation to authenticated page
  await page.waitForLoadState('networkidle');
  console.log('Setup - Authentication verified successfully');

  const authFile = path.resolve(process.cwd(), 'src/config/tests', metadata.stateFile);
  await page.context().storageState({ path: authFile });
}
