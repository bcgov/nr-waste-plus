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

const jwtfy = (jwtBody: any) => {
  const header = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';
  const payload = btoa(JSON.stringify(jwtBody))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  return `${header}.${payload}.`;
};

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
    idToken: jwtfy({
      'cognito:groups': ['WASTE_PLUS_ADMIN'],
      'preferred_username': 'b5ecdb094dfb4149a6a8445a01a96bf0@idir',
      'custom:idp_user_id': 'B5ECDB094DFB4149A6A8445A01A96BF0',
      'custom:idp_username': 'JRYAN',
      'custom:idp_display_name': 'Ryan, Jack Admin CIA:IN',
      'email': 'jack.ryan@gov.bc.ca',
      'email_verified': false,
      'custom:idp_name': 'idir',
    }),
  };

  const bceidData: CookieData = {
    lastAuthUser: 'bceidUser',
    idToken: jwtfy({
      'cognito:groups': [
        'WASTE_PLUS_VIEWER_00010005',
        'WASTE_PLUS_VIEWER_00001271',
        'WASTE_PLUS_VIEWER_00147603',
        'WASTE_PLUS_SUBMITTER_00010005',
        'WASTE_PLUS_SUBMITTER_00011457',
        'WASTE_PLUS_SUBMITTER_00001271',
      ],
      'custom:idp_username': 'uattest',
      'custom:idp_name': 'bceidbusiness',
      'custom:idp_business_id': 'automationinc',
      'custom:idp_display_name': 'Uat Test',
      'email': 'uattest@gov.bc.ca',
    }),
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
