import { mkdirSync, writeFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

const user = process.env.bceid_username ?? process.env.CYPRESS_bceid_username;
const password = process.env.bceid_password ?? process.env.CYPRESS_bceid_password;

test('Business BCeID login lands on the configured account', async ({ page }) => {
  test.skip(!user || !password, 'BCeID credentials are required');

  await page.goto('/');
  await page.getByRole('button', { name: /Log in with Business BCeID/i }).click();
  await page.waitForURL(/loginproxy|logon|clp-cgi|siteminder/i, { timeout: 12_000 });

  await page.locator('#user').first().fill(user!, { timeout: 12_000 });
  await page.locator('#password').first().fill(password!, { timeout: 12_000 });
  await page.locator('input[type="submit"]').first().click({ timeout: 12_000 });

  await expect(page).toHaveURL(/\/search/, { timeout: 12_000 });
  await page.getByRole('button', { name: 'Profile settings' }).click({ timeout: 12_000 });
  const panel = page.getByTestId('header-panel');
  // BCeID display name/email differ from the login username; assert the
  // provider identity instead of a guessed email mapping.
  await expect(panel).toContainText('BCEIDBUSINESS');
  await expect(panel).toContainText('BCeID');
});

test.afterEach(async ({ page }) => {
  const cookies = await page.context().cookies();
  const session = await page.evaluate(() => ({ ...window.sessionStorage }));
  const local = await page.evaluate(() => ({ ...window.localStorage }));
  const dir = '../cypress/.auth';
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/bceid-state.json`, JSON.stringify({ cookies, session, local }, null, 2));
});
