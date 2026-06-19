import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';
import { mockJwt } from '@/config/tests/auth.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

test.describe('Configuration District Volume List Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
    await mockApiResponsesWithStub(
      page,
      'configuration/district-average-volumes**',
      'district-average-volumes/list.json',
    );
  });

  test.describe('admin role (IDIR)', () => {
    test('should navigate to district volume list via side nav link @idir-only', async ({
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

      const districtVolumeLink = page.getByRole('link', { name: /View or update tables/ });
      await districtVolumeLink.click();
      await expect(page).toHaveURL(/\/configuration\/district-volume-tables$/);
    });

    test('should navigate to district volume list via direct URL @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/district-volume-tables');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/configuration\/district-volume-tables$/);
    });

    test('should display correct page content @idir-only', async ({ page }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/district-volume-tables');
      await page.waitForLoadState('domcontentloaded');

      await expect(
        page.getByRole('heading', { name: 'District average waste volumes' }),
      ).toBeVisible();
      await expect(
        page.getByText(
          'View tables used to calculate volumes when district average waste assessment is used',
        ),
      ).toBeVisible();
      await expect(
        page.getByRole('button', { name: /Upload new volumes table/i }),
      ).toBeVisible();
    });

    test('should display the data table with results @idir-only', async ({ page }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/district-volume-tables');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('district-volume-list')).toBeVisible();
      await expect(page.getByText('INTERIOR')).toBeVisible();
      await expect(page.getByText('COASTAL')).toBeVisible();
    });

    test('should navigate to upload page when upload button is clicked @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/district-volume-tables');
      await page.waitForLoadState('domcontentloaded');

      await page.getByRole('button', { name: /Upload new volumes table/i }).click();

      await expect(page).toHaveURL(/\/configuration\/upload-district-volume$/);
    });

    test('should navigate back to configuration via breadcrumb @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/district-volume-tables');
      await page.waitForLoadState('domcontentloaded');

      const breadcrumb = page.getByRole('link', { name: 'Configuration' });
      await breadcrumb.click();

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

    test('should redirect to unauthorized when non-admin user accesses district volume list via direct URL @bceid-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'bceidbusiness',
        'cognito:groups': ['WASTE_PLUS_VIEWER_00147603'],
      });

      await page.goto('/configuration/district-volume-tables');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/unauthorized/);
    });
  });
});
