import { test, expect } from '@playwright/test';

import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Global Error Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await mockApiResponsesWithStub(page, 'users/preferences', 'users/preferences-GET.json');

    if (testInfo.project.metadata.userType === 'bceid') {
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
    }

    await mockApiResponsesWithStub(page, 'codes/districts', 'codes/districts.json');
    await mockApiResponsesWithStub(page, 'codes/samplings', 'codes/samplings.json');
    await mockApiResponsesWithStub(
      page,
      'codes/assess-area-statuses',
      'codes/assess-area-statuses.json',
    );
  });

  test('shows the global error boundary when a protected route crashes during render', async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.metadata.userType === 'bceid',
      'This scenario is validated on IDIR to avoid BCeID role-rule redirects.',
    );

    await page.route('**/src/pages/WasteSearch/index.tsx*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `export default function WasteSearchPage() { throw new Error('E2E forced route render failure'); }`,
      });
    });

    await mockJwt(page, testInfo.project.metadata, {
      'cognito:groups': ['WASTE_PLUS_ADMIN'],
    });

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Global Error')).toBeVisible();
    await expect(page.getByText('E2E forced route render failure', { exact: true })).toBeVisible();
  });
});
