/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import path from 'node:path';

import type { Page } from '@playwright/test';

export async function authenticate(page: Page, metadata: Record<string, any>): Promise<void> {
  // Fill credentials (use env vars for security)
  console.log(`Setup -  Auth: ${metadata.user} via ${metadata.userType.toLowerCase()}`);
  await page.goto('/landing');

  await page.waitForLoadState('networkidle');

  const notFoundVisible = await page
    .getByRole('heading', { name: 'Content Not Found' })
    .isVisible({ timeout: 2000 }); // 2s max

  const searchPageVisible = await page
    .getByRole('heading', { name: 'Waste search' })
    .isVisible({ timeout: 2000 }); // 2s max

  if (notFoundVisible || searchPageVisible) {
    console.log('Setup - Already authenticated, skipping login');
    return;
  }

  await page.getByTestId(`landing-button__${metadata.userType.toLowerCase()}`).click();

  await page.waitForLoadState('networkidle');
  await page.locator('#user').waitFor({ state: 'visible', timeout: 60000 });

  console.log(`Setup - Filling credentials for user: ${metadata.user}`);
  await page.fill('#user', metadata.user);
  await page.fill('#password', metadata.password);

  console.log('Setup - Submitting login form');
  await page.click('input[name="btnSubmit"]');

  // Wait for navigation to authenticated page
  console.log('Setup - Waiting for authentication to complete...');
  await page.waitForLoadState('networkidle');

  console.log('Setup - Authentication verified successfully');

  const authFile = path.resolve(process.cwd(), 'src/config/tests', metadata.stateFile);

  console.log(`Setup - Saving storage state to ${authFile}`);
  await page.context().storageState({ path: authFile });
}
