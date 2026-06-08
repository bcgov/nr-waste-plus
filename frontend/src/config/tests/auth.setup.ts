import { test as setup } from '@playwright/test';

import { authenticate, mockAuthenticate } from './auth.helper';

setup('authenticate', async ({ page }, testInfo) => {
  const authFunction = testInfo.project.metadata.shouldMockAuthentication
    ? mockAuthenticate
    : authenticate;
  await authFunction(page, testInfo.project.metadata);
});
