/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import crypto from 'node:crypto';
import path from 'node:path';

import type { Page } from '@playwright/test';

interface CookieData {
  lastAuthUser: string;
  idToken: string;
}

const defaultGroups = {
  bceid: [
    'WASTE_PLUS_VIEWER_00010005',
    'WASTE_PLUS_VIEWER_00001271',
    'WASTE_PLUS_VIEWER_00147603',
    'WASTE_PLUS_SUBMITTER_00010005',
    'WASTE_PLUS_SUBMITTER_00011457',
    'WASTE_PLUS_SUBMITTER_00001271',
  ],
  idir: ['WASTE_PLUS_ADMIN'],
};

const defaultClaims = (userId: string, businessId: string) => {
  const idir = {
    'custom:idp_name': 'idir',
    'cognito:groups': defaultGroups.idir,
    'cognito:username': `test-idir_${userId}@idir`,
    'custom:idp_user_id': userId.toUpperCase(),
    'custom:idp_username': 'JRYAN',
    'custom:idp_display_name': 'Ryan, Jack Admin CIA:IN',
    'email': 'jack.ryan@gov.bc.ca',
    'preferred_username': `${userId}@idir`,
    'email_verified': false,
  };
  const bceid = {
    'custom:idp_name': 'bceidbusiness',
    'cognito:groups': defaultGroups.bceid,
    'custom:idp_business_id': businessId.toUpperCase(),
    'cognito:username': `test-bceidbusiness_${userId}@bceidbusiness`,
    'custom:idp_user_id': userId.toUpperCase(),
    'custom:idp_username': 'uattest',
    'custom:idp_display_name': 'Uat Test',
    'email': 'uattest@gov.bc.ca',
  };
  return { idir, bceid };
};

const genRandomId = () => crypto.randomBytes(16).toString('hex');

const setupCustomClaims = (
  userType: 'idir' | 'bceid',
  claimOverrides: Record<string, any> = {},
): CookieData => {
  const lastAuthUser = userType === 'idir' ? 'idirUser' : 'bceidUser';
  const { idir, bceid } = defaultClaims(genRandomId(), genRandomId());

  return {
    lastAuthUser,
    idToken: jwtfy(
      userType === 'idir' ? { ...idir, ...claimOverrides } : { ...bceid, ...claimOverrides },
    ),
  };
};

export async function mockJwt(
  page: Page,
  metadata: Record<string, any>,
  claimOverrides: Record<string, any> = {},
) {
  const cookieData = setupCustomClaims(metadata.userType.toLowerCase(), claimOverrides);

  const { lastAuthUser, idToken } = cookieData;

  const clientId = metadata.userPoolsClientId ?? process.env.VITE_USER_POOLS_WEB_CLIENT_ID;
  if (!clientId) {
    throw new Error('VITE_USER_POOLS_WEB_CLIENT_ID is not defined for mockJwt');
  }
  await page
    .context()
    .clearCookies({ name: `CognitoIdentityServiceProvider.${clientId}.LastAuthUser` });
  await page
    .context()
    .clearCookies({ name: `CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken` });
  await page.context().addCookies([
    {
      name: `CognitoIdentityServiceProvider.${clientId}.LastAuthUser`,
      value: lastAuthUser,
      sameSite: 'Lax',
      expires: 2908989880,
      path: '/',
      domain: 'localhost',
    },
    {
      name: `CognitoIdentityServiceProvider.${clientId}.${lastAuthUser}.idToken`,
      value: idToken,
      sameSite: 'Lax',
      expires: 2908989880,
      path: '/',
      domain: 'localhost',
    },
  ]);
  await page.reload();
}

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

export const jwtfy = (jwtBody: object) => {
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

  // Set the JWT cookie directly to mock authentication without UI interaction
  // We set no additional claims by default
  await mockJwt(page, metadata);

  const authFile = path.resolve(process.cwd(), 'src/config/tests', metadata.stateFile);

  console.log(`Setup - Saving storage state to ${authFile}`);
  await page.context().storageState({ path: authFile });
}
