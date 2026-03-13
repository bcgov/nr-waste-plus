import { test, expect } from '@playwright/test';

import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('No Role Page', () => {
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

  test('redirects to /no-role from a protected page when user has no assigned roles', async ({
    page,
  }, testInfo) => {
    test.skip(
      process.env.VITE_MOCK_AUTH?.toLowerCase() !== 'true',
      'Per-test role override requires VITE_MOCK_AUTH=true.',
    );

    await mockJwt(page, testInfo.project.metadata, {
      'cognito:groups': [],
    });

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveURL(/\/no-role$/);
    await expect(page.getByText('Unauthorized Access')).toBeVisible();
    await expect(
      page.getByText("You don't have FAM authorization to access this system"),
    ).toBeVisible();
  });

  test('navigates away from /no-role when user has an assigned role', async (
    {
      page,
    },
    testInfo,
  ) => {
    test.skip(
      process.env.VITE_MOCK_AUTH?.toLowerCase() !== 'true',
      'Per-test role override requires VITE_MOCK_AUTH=true.',
    );

    await mockJwt(page, testInfo.project.metadata, {
      'custom:idp_name': 'bceidbusiness',
      'cognito:groups': ['WASTE_PLUS_VIEWER_00010005'],
    });

    await page.goto('/no-role');
    await page.waitForLoadState('networkidle');

    await expect(page).not.toHaveURL(/\/no-role$/);
    await expect(page.getByRole('heading', { name: 'Unauthorized Access' })).toHaveCount(0);
  });
});
