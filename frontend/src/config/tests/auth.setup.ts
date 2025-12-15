import { test as setup } from '@playwright/test';

import { authenticate } from './auth.helper';
import { mockApiResponsesWithStub } from './e2e.helper';

setup.beforeEach(async ({ page }) => {
  await mockApiResponsesWithStub(page, 'users/preferences', 'users/preferences-GET-bceid.json');
  await mockApiResponsesWithStub(
    page,
    'forest-clients/searchByNumbers**',
    'forest-clients/searchByNumbers-pg0.json',
  );
  await mockApiResponsesWithStub(
    page,
    'forest-clients/clients**',
    'forest-clients/clients-pg0.json',
  );

  await mockApiResponsesWithStub(page, 'codes/districts', 'codes/districts.json');

  await mockApiResponsesWithStub(page, 'codes/samplings', 'codes/samplings.json');

  await mockApiResponsesWithStub(
    page,
    'codes/assess-area-statuses',
    'codes/assess-area-statuses.json',
  );
  await page.waitForLoadState('networkidle');
});

setup('authenticate', async ({ page }, testInfo) => {
  await authenticate(page, testInfo.project.metadata);
});
