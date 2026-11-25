import { expect, test, type Locator, type Page } from '@playwright/test';

import { freshTotp } from './totp';

const user = process.env.E2E_IDIR_USER ?? process.env.idir_username;
const password = process.env.E2E_IDIR_PASSWORD ?? process.env.idir_password;
const secret = process.env.E2E_IDIR_TOTP_SECRET ?? process.env.idir_totp_secret;

/** Set the value without putting it in Playwright's step titles or artifacts. */
const fillSecret = async (locator: Locator, value: string): Promise<void> => {
  await locator.waitFor();
  await locator.evaluate((el, v) => {
    const input = el as HTMLInputElement;
    input.focus();
    input.value = v;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
};

const completeTotpChallenge = async (page: Page): Promise<void> => {
  if (!secret) return;
  const codeInput = page.locator('input[name="otc"], #idTxtBx_SAOTCC_OTC').first();
  const otherWay = page.locator('#signInAnotherWay').first();
  const backToApp = page.waitForURL((url) => url.pathname.startsWith('/search'), {
    timeout: 30_000,
  });

  const first = await Promise.race([
    codeInput.waitFor({ timeout: 30_000 }).then(() => 'code' as const),
    otherWay.waitFor({ timeout: 30_000 }).then(() => 'other' as const),
    backToApp.then(() => 'done' as const),
  ]).catch(() => 'none' as const);
  backToApp.catch(() => undefined);

  if (first === 'done' || first === 'none') return;

  if (first === 'other') {
    await otherWay.click();
    await page.locator('[data-value="PhoneAppOTP"]').first().click();
    await codeInput.waitFor({ timeout: 30_000 });
  }

  await fillSecret(codeInput, await freshTotp(secret));
  await page
    .locator('#idSubmit_SAOTCC_Continue, input[type="submit"], button[type="submit"]')
    .first()
    .click();
};

/** Clear the interstitials Entra shows between MFA and the app redirect. */
const finishPostMfaPrompts = async (page: Page): Promise<void> => {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (new URL(page.url()).pathname.startsWith('/search')) return;
    const stay = page.locator('input#idBtn_Back, input[value="No"]').first();
    if (await stay.isVisible().catch(() => false)) {
      await stay.click();
      continue;
    }
    const pick = page.getByRole('heading', { name: /pick an account/i });
    if (await pick.isVisible().catch(() => false)) {
      const local = (user ?? '').split('\\').pop()!.split('@')[0];
      await page.getByText(new RegExp(`^${local}`, 'i')).first().click();
      continue;
    }
    await page.waitForTimeout(500);
  }
};

test('IDIR login lands on the configured E2E account', async ({ page }) => {
  test.skip(!user || !password || !secret, 'IDIR SSO credentials/TOTP secret are required');

  await page.goto('/');
  await page.getByRole('button', { name: /Log in with IDIR/i }).click();
  await page.waitForURL(/loginproxy|microsoftonline|logon/i, { timeout: 60_000 });

  await page.locator('input[name="loginfmt"], input[type="email"]').first().fill(user!);
  await page.locator('input[type="submit"], button[type="submit"]').first().click();
  await fillSecret(
    page.locator('input[name="passwd"], input[type="password"]').first(),
    password!,
  );
  await page.locator('input[type="submit"], button[type="submit"]').first().click();

  await completeTotpChallenge(page);
  await finishPostMfaPrompts(page);

  await expect(page).toHaveURL(/\/search/, { timeout: 60_000 });
  await page.getByRole('button', { name: 'Profile settings' }).click();
  const panel = page.getByTestId('header-panel');
  await expect(panel.getByRole('heading', { name: 'My Profile' })).toBeVisible();
  await expect(panel).toContainText(`Email: ${user}`);
  await expect(panel).toContainText(`IDIR\\${user!.split('@')[0].toUpperCase()}`);
});
