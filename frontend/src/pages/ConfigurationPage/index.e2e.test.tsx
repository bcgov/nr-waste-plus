import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

test.describe('Configuration Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
  });

  test.describe('admin role (IDIR)', () => {
    test('should navigate to Configuration page via side nav link @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/search');
      await page.waitForLoadState('domcontentloaded');

      const configLink = page.getByTestId('side-nav-link-config');
      await expect(configLink).toBeVisible();

      await configLink.click();
      await expect(page).toHaveURL(/\/configuration$/);
    });

    test('should navigate to Configuration page via direct URL @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/configuration$/);
    });

    test('should display correct page content @idir-only', async ({ page }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByRole('heading', { name: 'Configuration' })).toBeVisible();
      await expect(page.getByText('Check and manage configuration data')).toBeVisible();
      await expect(page.getByText('District average waste volumes')).toBeVisible();
      await expect(
        page.getByText(
          'Volume tables used to calculate volumes when district averages are used for waste assessment',
        ),
      ).toBeVisible();
      await expect(page.getByRole('link', { name: 'View or update tables' })).toBeVisible();
    });

    test('should navigate to district volume tables when card button is clicked @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration');
      await page.waitForLoadState('domcontentloaded');

      await page.getByRole('link', { name: 'View or update tables' }).click();

      await expect(page).toHaveURL(/\/configuration\/district-volume-tables$/);
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

    test('should redirect to unauthorized when non-admin user accesses Configuration via direct URL @bceid-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'bceidbusiness',
        'cognito:groups': ['WASTE_PLUS_VIEWER_00147603'],
      });

      await page.goto('/configuration');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/unauthorized/);
    });
  });
});
