import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

test.describe('Species Composition List Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
  });

  test.describe('admin role (IDIR)', () => {
    test('should navigate to species composition list via config card @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/search');
      await page.waitForLoadState('domcontentloaded');

      // Click side nav config link
      await page.getByTestId('side-nav-link-config').click();
      await expect(page).toHaveURL(/\/configuration$/);

      // Click the second "View or update tables" link (species composition card)
      await page
        .getByRole('link', { name: /View or update tables/ })
        .nth(1)
        .click();
      await expect(page).toHaveURL(/\/configuration\/species-composition$/);
    });

    test('should land on species composition list via direct URL @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/configuration\/species-composition$/);
    });

    test('should display correct page content @idir-only', async ({ page }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition');
      await page.waitForLoadState('domcontentloaded');

      await expect(
        page.getByRole('heading', { name: 'District level species composition' }),
      ).toBeVisible();
      await expect(
        page.getByText(
          'View tables used to calculate volumes when district average waste assessment is used',
        ),
      ).toBeVisible();
    });

    test('should navigate back to configuration via breadcrumb @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition');
      await page.waitForLoadState('domcontentloaded');

      // Scope to the breadcrumb container to avoid matching side nav links
      const breadcrumb = page.locator('.page-title-breadcrumb');
      await breadcrumb.getByText('Configuration').click();

      await expect(page).toHaveURL(/\/configuration$/);
    });
  });

  test.describe('non-admin role', () => {
    test('should not show Configuration link in side nav for non-admin users @bceid-only', async ({
      page,
    }) => {
      await page.goto('/search');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('side-nav-link-config')).toHaveCount(0);
    });

    test('should redirect to unauthorized when non-admin user accesses species composition list via direct URL @bceid-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'bceidbusiness',
        'cognito:groups': ['WASTE_PLUS_VIEWER_00147603'],
      });

      await page.goto('/configuration/species-composition');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/unauthorized/);
    });
  });
});
