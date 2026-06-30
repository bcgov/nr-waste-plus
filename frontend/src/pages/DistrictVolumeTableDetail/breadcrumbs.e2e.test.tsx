import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

test.describe('District Volume Table Detail — Breadcrumbs', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
    await mockJwt(page, testInfo.project.metadata, {
      'custom:idp_name': 'idir',
      'cognito:groups': ['WASTE_PLUS_ADMIN'],
    });
    await mockApiResponsesWithStub(
      page,
      'configuration/district-average-volumes/1',
      'district-average-volumes/interior-detail.json',
    );
  });

  test('should navigate to district volume list via breadcrumb @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/1');
    await page.waitForLoadState('domcontentloaded');

    // Scope to the breadcrumb container to avoid matching side nav links
    const breadcrumb = page.locator('.page-title-breadcrumb');

    // Verify breadcrumb text is visible
    await expect(breadcrumb.getByText('District average volumes')).toBeVisible();

    // Click "District average volumes" breadcrumb
    await breadcrumb.getByText('District average volumes').click();

    // Verify URL matches district volume tables list
    await expect(page).toHaveURL(/\/configuration\/district-volume-tables$/);
  });

  test('should navigate to configuration via breadcrumb @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/1');
    await page.waitForLoadState('domcontentloaded');

    // Scope to the breadcrumb container to avoid matching side nav links
    const breadcrumb = page.locator('.page-title-breadcrumb');

    // Verify breadcrumb text is visible
    await expect(breadcrumb.getByText('Configuration')).toBeVisible();

    // Click "Configuration" breadcrumb
    await breadcrumb.getByText('Configuration').click();

    // Verify URL matches configuration page
    await expect(page).toHaveURL(/\/configuration$/);
  });
});
