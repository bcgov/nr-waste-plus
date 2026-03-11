/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import path from 'node:path';

import type { Page } from '@playwright/test';

async function initializeAndCheck(page: Page): Promise<boolean> {
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
    return true;
  }

  return false;
}

export async function authenticate(page: Page, metadata: Record<string, any>): Promise<void> {
  // Fill credentials (use env vars for security)
  console.log(`Setup - Auth: ${metadata.user} via ${metadata.userType.toLowerCase()}`);

  const alreadyAuthenticated = await initializeAndCheck(page);
  if (alreadyAuthenticated) {
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

export async function mockAuthenticate(page: Page, metadata: Record<string, any>): Promise<void> {
  console.log(`Setup - Mock Auth: ${metadata.userType.toLowerCase()} user`);

  const alreadyAuthenticated = await initializeAndCheck(page);
  if (alreadyAuthenticated) {
    return;
  }

  interface CookieData {
    lastAuthUser: string;
    idToken: string;
  }

  const idirData: CookieData = {
    lastAuthUser: 'idirUser',
    idToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2duaXRvOmdyb3VwcyI6WyJXQVNURV9QTFVTX0FETUlOIl0sInByZWZlcnJlZF91c2VybmFtZSI6ImI1ZWNkYjA5NGRmYjQxNDlhNmE4NDQ1YTAxYTk2YmYwQGlkaXIiLCJjdXN0b206aWRwX3VzZXJfaWQiOiJCNUVDREIwOTRERkI0MTQ5QTZBODQ0NUEwMUE5NkJGMCIsImN1c3RvbTppZHBfdXNlcm5hbWUiOiJKUllBTiIsImN1c3RvbTppZHBfZGlzcGxheV9uYW1lIjoiUnlhbiwgSmFjayBBZG1pbiBDSUE6SU4iLCJlbWFpbCI6ImphY2sucnlhbkBnb3YuYmMuY2EiLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImN1c3RvbTppZHBfbmFtZSI6ImlkaXIifQ.hdx5vkjsCixRpEepjLh_tGEPRTml1zD4UeA0RjVMbu8',
  };

  const bceidData: CookieData = {
    lastAuthUser: 'bceidUser',
    idToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjb2duaXRvOmdyb3VwcyI6WyJXQVNURV9QTFVTX1ZJRVdFUl8wMDAxMDAwNSIsIldBU1RFX1BMVVNfVklFV0VSXzAwMDAxMjcxIiwiV0FTVEVfUExVU19WSUVXRVJfMDAxNDc2MDMiLCJXQVNURV9QTFVTX1NVQk1JVFRFUl8wMDAxMDAwNSIsIldBU1RFX1BMVVNfU1VCTUlUVEVSXzAwMDExNDU3IiwiV0FTVEVfUExVU19TVUJNSVRURVJfMDAwMDEyNzEiXSwiY3VzdG9tOmlkcF91c2VybmFtZSI6InVhdHRlc3QiLCJjdXN0b206aWRwX25hbWUiOiJiY2VpZGJ1c2luZXNzIiwiY3VzdG9tOmlkcF9idXNpbmVzc19pZCI6ImF1dG9tYXRpb25pbmMiLCJjdXN0b206aWRwX2Rpc3BsYXlfbmFtZSI6IlVhdCBUZXN0IiwiZW1haWwiOiJ1YXR0ZXN0QGdvdi5iYy5jYSJ9.bKqHc1bWAyXkTW3JjlU3lgQro6MNoJDdjoVtpfQ8UyY',
  };

  const cookieData = metadata.userType.toLowerCase() === 'idir' ? idirData : bceidData;

  const { lastAuthUser, idToken } = cookieData;

  page.context().addCookies([
    {
      name: 'CognitoIdentityServiceProvider.24eecb7emheb8vkqqu5liun757.LastAuthUser',
      value: lastAuthUser,
      sameSite: 'Lax',
      expires: 2908989880,
      path: '/',
      domain: 'localhost',
    },
    {
      name: `CognitoIdentityServiceProvider.24eecb7emheb8vkqqu5liun757.${lastAuthUser}.idToken`,
      value: idToken,
      sameSite: 'Lax',
      expires: 2908989880,
      path: '/',
      domain: 'localhost',
    },
  ]);
  await page.reload();

  const authFile = path.resolve(process.cwd(), 'src/config/tests', metadata.stateFile);

  console.log(`Setup - Saving storage state to ${authFile}`);
  await page.context().storageState({ path: authFile });
}
