import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page, type TestInfo } from '@playwright/test';

import { getMockUserStorageKey, mockJwt } from '@/config/tests/auth.helper';

const OIDC_FILES = path.resolve(process.cwd(), 'stub', '__files', 'oidc');
const SESSION_FIXTURE = path.join(OIDC_FILES, 'session-idir.json');

/** Mirrors buildMockAuthority() in auth.helper.ts for discovery metadata. */
const mockAuthority = (): string => {
  const backendUrl = process.env.VITE_BACKEND_URL ?? 'http://localhost:8080';
  return `http://${backendUrl.replace(/^https?:\/\//, '').replace(':8080', ':8181')}/realms/standard`;
};

type StoredSession = {
  access_token: string;
  id_token: string;
  expires_at: number;
};

/** Reads the pre-signed mock tokens so the stubbed response stays well-formed. */
const loadSession = (): StoredSession =>
  JSON.parse(fs.readFileSync(SESSION_FIXTURE, 'utf-8')) as StoredSession;

/** Seeds a session with an exact expiry and counts token-endpoint calls. */
const seedSession = async (
  page: Page,
  testInfo: TestInfo,
  expiresAtSeconds: number,
  failToken = false,
): Promise<{ tokenCalls: () => number }> => {
  await page.clock.install({ time: new Date() });
  await mockJwt(page, testInfo.project.metadata, { exp: expiresAtSeconds });

  let calls = 0;
  const session = loadSession();
  const jsonHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };
  const issuer = mockAuthority();

  // The e2e webServer runs only `vite preview` — WireMock is not started — so
  // discovery and JWKS must be stubbed for signinSilent() to reach the token route.
  await page.route('**/realms/standard/.well-known/openid-configuration', async (route) => {
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: JSON.stringify({
        issuer,
        authorization_endpoint: `${issuer}/protocol/openid-connect/auth`,
        token_endpoint: `${issuer}/protocol/openid-connect/token`,
        userinfo_endpoint: `${issuer}/protocol/openid-connect/userinfo`,
        end_session_endpoint: `${issuer}/protocol/openid-connect/logout`,
        jwks_uri: `${issuer}/protocol/openid-connect/certs`,
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        subject_types_supported: ['public'],
        id_token_signing_alg_values_supported: ['RS256'],
        code_challenge_methods_supported: ['S256'],
        scopes_supported: ['openid', 'profile', 'email'],
      }),
    });
  });
  await page.route('**/realms/standard/protocol/openid-connect/certs', async (route) => {
    await route.fulfill({
      status: 200,
      headers: jsonHeaders,
      body: fs.readFileSync(path.join(OIDC_FILES, 'jwks.json'), 'utf-8'),
    });
  });

  await page.route('**/realms/standard/protocol/openid-connect/token', async (route) => {
    calls += 1;
    if (failToken) {
      await route.fulfill({
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'server_error' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        access_token: session.access_token,
        id_token: session.id_token,
        token_type: 'Bearer',
        expires_in: 1800,
        scope: 'openid profile email',
      }),
    });
  });
  return { tokenCalls: () => calls };
};

const storedExpiresAt = async (page: Page): Promise<number | null> =>
  page.evaluate((key) => {
    const raw = globalThis.localStorage.getItem(key);
    return raw ? (JSON.parse(raw).expires_at as number) : null;
  }, getMockUserStorageKey());

test.describe('Activity-based session renewal @idir-only', () => {
  test('renews an active user inside the 60 s margin', async ({ page }, testInfo) => {
    // Inside the 60 s margin at mount: renewal fires on the initial evaluation,
    // avoiding the 30 s-clamped timer racing the 30 s evaluation dedupe.
    // Timer re-arm itself is covered by the AuthProvider unit test.
    const seededExpiry = Math.floor(Date.now() / 1000) + 45;
    const { tokenCalls } = await seedSession(page, testInfo, seededExpiry);

    await page.goto('/');
    await expect(page.locator('.cds--header__name')).toBeVisible();

    await expect.poll(() => tokenCalls()).toBeGreaterThan(0);
    await expect(page.locator('.cds--header__name')).toBeVisible();
    await expect(page.getByTestId('landing-button__idir')).toHaveCount(0);
    await expect.poll(() => storedExpiresAt(page)).toBeGreaterThan(seededExpiry);
  });

  test('clears an idle expired session without contacting the token endpoint', async ({
    page,
  }, testInfo) => {
    await page.addInitScript(() => {
      Object.defineProperty(document, 'hidden', { get: () => true, configurable: true });
    });
    const { tokenCalls } = await seedSession(page, testInfo, Math.floor(Date.now() / 1000) - 10);

    await page.goto('/');

    await expect(page.getByTestId('landing-button__idir')).toBeVisible();
    await expect(page.getByTestId('landing-button__bceid')).toBeVisible();
    await expect.poll(() => tokenCalls()).toBe(0);
  });

  test('clears the session after two failed renewals with an observable signal', async ({
    page,
  }, testInfo) => {
    const seededExpiry = Math.floor(Date.now() / 1000) + 45;
    const messages: string[] = [];
    page.on('console', (message) => messages.push(message.text()));
    const { tokenCalls } = await seedSession(page, testInfo, seededExpiry, true);

    await page.goto('/');
    await expect(page.locator('.cds--header__name')).toBeVisible();

    await expect
      .poll(() => messages.some((text) => text.includes('auth.renewal_failed')))
      .toBe(true);
    await expect(page.locator('.cds--header__name')).toBeVisible();
    expect(tokenCalls()).toBeGreaterThan(0);

    // The first failure schedules the retry 60 s later; advance past it.
    await page.clock.runFor(60_000);
    await expect.poll(() => storedExpiresAt(page)).toBeNull();
    await expect(page.getByTestId('landing-button__idir')).toBeVisible();
  });
});
