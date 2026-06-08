import { test, expect } from '@playwright/test';

import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';
import { setupAppShellMocks } from '@/config/tests/app.setup';

test.describe('Not Found Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
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

    await page.goto('/a-route-that-does-not-exist');

    await expect(page.getByText('Content Not Found')).toBeVisible();
    await expect(page.getByText('The page you are looking for does not exist.')).toBeVisible();
  });

  test.describe('when not authenticated', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('redirects unknown routes to the landing page', async ({ page }) => {
      await page.goto('/a-route-that-does-not-exist');

      await expect(page.getByTestId('landing-title')).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Content Not Found' })).toHaveCount(0);
    });
  });
});
