import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponses } from '@/config/tests/e2e.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

test.describe('District Volume Table Detail — Error States', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
    await mockJwt(page, testInfo.project.metadata, {
      'custom:idp_name': 'idir',
      'cognito:groups': ['WASTE_PLUS_ADMIN'],
    });
  });

  test('should show error page when API returns 404 @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await mockApiResponses(
      page,
      'configuration/district-average-volumes/999',
      404,
      'application/problem+json',
      {
        status: 404,
        title: 'Not Found',
        detail: 'District volume table not found.',
        instance: '/api/configuration/district-average-volumes/999',
      },
    );

    await page.goto('/configuration/district-volume-tables/999');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: 'District Volume Table not found' }),
    ).toBeVisible();
    await expect(
      page.getByText('Required data is missing or an error occurred while loading.'),
    ).toBeVisible();
  });

  test('should show error page when API returns 500 @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await mockApiResponses(
      page,
      'configuration/district-average-volumes/1',
      500,
      'application/problem+json',
      {
        status: 500,
        title: 'Internal Server Error',
        detail: 'An unexpected error occurred.',
      },
    );

    await page.goto('/configuration/district-volume-tables/1');
    await page.waitForLoadState('domcontentloaded');

    await expect(
      page.getByRole('heading', { name: 'District Volume Table not found' }),
    ).toBeVisible();
    await expect(
      page.getByText('Required data is missing or an error occurred while loading.'),
    ).toBeVisible();
  });
});
