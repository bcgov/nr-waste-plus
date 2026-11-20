import fs from 'node:fs';
import path from 'node:path';

import { expect, test, type Page } from '@playwright/test';

import { getMockAuthority, getMockUserStorageKey } from '@/config/tests/auth.helper';

const OIDC_FILES = path.resolve(process.cwd(), 'stub', '__files', 'oidc');

type StoredSession = {
  access_token: string;
  id_token: string;
  refresh_token: string;
};

/**
 * Stubs the whole mock realm so a landing-page login can complete without
 * WireMock (the e2e webServer runs only `vite preview`).
 *
 * @param page The Playwright page.
 * @param failToken Return a 500 from the token endpoint to exercise the catch branch.
 * @returns Readable token-endpoint call count.
 */
const stubRealm = async (page: Page, failToken = false): Promise<() => number> => {
  const session = JSON.parse(
    fs.readFileSync(path.join(OIDC_FILES, 'session-idir.json'), 'utf-8'),
  ) as StoredSession;
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  };
  const issuer = getMockAuthority();

  await page.route('**/realms/standard/.well-known/openid-configuration', async (route) => {
    await route.fulfill({
      status: 200,
      headers,
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
      headers,
      body: fs.readFileSync(path.join(OIDC_FILES, 'jwks.json'), 'utf-8'),
    });
  });
  // Trailing * is required: the authorization URL carries a query string.
  await page.route('**/realms/standard/protocol/openid-connect/auth*', async (route) => {
    const url = new URL(route.request().url());
    const state = url.searchParams.get('state') ?? '';
    const redirectUri = url.searchParams.get('redirect_uri') ?? '';
    await route.fulfill({
      status: 302,
      headers: { Location: `${redirectUri}?code=mock-code&state=${encodeURIComponent(state)}` },
    });
  });

  let calls = 0;
  await page.route('**/realms/standard/protocol/openid-connect/token', async (route) => {
    calls += 1;
    await route.fulfill({
      status: failToken ? 500 : 200,
      headers,
      body: failToken
        ? JSON.stringify({ error: 'server_error' })
        : JSON.stringify({
            access_token: session.access_token,
            id_token: session.id_token,
            refresh_token: session.refresh_token,
            token_type: 'Bearer',
            expires_in: 1800,
            scope: 'openid profile email',
          }),
    });
  });
  return () => calls;
};

test.describe('Auth callback propagation @idir-only', () => {
  // Real callback path: no pre-seeded session, or the bug would be masked.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('lands on the persisted target authenticated without a reload', async ({ page }) => {
    const tokenCalls = await stubRealm(page);
    await page.goto('/');

    await expect(page.getByTestId('landing-button__idir')).toBeVisible();
    expect(
      await page.evaluate((key) => localStorage.getItem(key), getMockUserStorageKey()),
    ).toBeNull();
    await page.evaluate(() => sessionStorage.setItem('redirectAfterLogin', '/search?legacy=true'));

    await page.getByTestId('landing-button__idir').click();

    await expect(page.locator('.cds--header__name')).toBeVisible({ timeout: 20_000 });
    await expect.poll(() => page.url()).toMatch(/\/search\?legacy=true$/);
    expect(await page.evaluate(() => sessionStorage.getItem('redirectAfterLogin'))).toBeNull();
    await expect.poll(() => tokenCalls()).toBe(1);
    expect(
      await page.evaluate((key) => localStorage.getItem(key) !== null, getMockUserStorageKey()),
    ).toBe(true);
  });

  test('failed exchange stays public and clears the persisted redirect', async ({ page }) => {
    await stubRealm(page, true);
    await page.goto('/');
    await page.evaluate(() => sessionStorage.setItem('redirectAfterLogin', '/search?legacy=true'));

    await page.getByTestId('landing-button__idir').click();

    await expect.poll(() => page.url()).toMatch(/\/$/);
    await expect(page.locator('.cds--header__name')).toHaveCount(0);
    await expect(page.getByTestId('landing-button__idir')).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('redirectAfterLogin'))).toBeNull();
  });
});
