import { test as setup } from '@playwright/test';

import { authenticate, mockAuthenticate } from './auth.helper';

setup('authenticate', async ({ page }, testInfo) => {
  const shouldMockAuth = process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';
  const authFunction = shouldMockAuth ? mockAuthenticate : authenticate;
  await authFunction(page, testInfo.project.metadata);
});
