import { test, expect } from '@playwright/test';

import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Not Found Page', () => {
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

  test('shows the Not Found page for authenticated users on unknown routes', async ({ page }) => {
    test.skip(
      process.env.VITE_MOCK_AUTH?.toLowerCase() !== 'true',
      'Deterministic role override for this scenario requires VITE_MOCK_AUTH=true.',
    );

    test.skip(
      test.info().project.metadata.userType === 'bceid',
      'BCeID test users can be redirected by role-validation rules before Not Found renders.',
    );

    await mockApiResponsesWithStub(page, 'users/preferences', 'users/preferences-GET.json');

    await page.goto('/search');
    await page.waitForLoadState('networkidle');

    await page.goto('/a-route-that-does-not-exist');
    await page.waitForLoadState('networkidle');

    await expect(page.getByText('Content Not Found')).toBeVisible();
    await expect(page.getByText('The page you are looking for does not exist.')).toBeVisible();
  });

  test.describe('when not authenticated', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('redirects unknown routes to the landing page', async ({ page }) => {
      await page.goto('/a-route-that-does-not-exist');
      await page.waitForLoadState('networkidle');

      await expect(page.getByTestId('landing-title')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Content Not Found' })).toHaveCount(0);
    });
  });
});
