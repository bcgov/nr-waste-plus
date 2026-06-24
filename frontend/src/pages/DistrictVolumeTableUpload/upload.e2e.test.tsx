import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';
import { mockJwt } from '@/config/tests/auth.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

test.describe('District Volume Table Upload Page - E2E', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
    await mockApiResponsesWithStub(
      page,
      'configuration/district-average-volumes**',
      'district-average-volumes/list.json',
    );
  });

  test.describe('Admin role (IDIR) - Correct role scenarios', () => {
    test('should navigate from search page through configuration to upload page via side nav @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      // Navigate from search page through configuration
      await page.goto('/search');
      await page.waitForLoadState('domcontentloaded');

      const configLink = page.getByTestId('side-nav-link-config');
      await expect(configLink).toBeVisible();

      await configLink.click();
      await expect(page).toHaveURL(/\/configuration$/);

      const districtVolumeLink = page.getByRole('button', { name: /View or update tables/i });
      await districtVolumeLink.click();
      await expect(page).toHaveURL(/\/configuration\/district-volume-tables$/);

      // Click upload button
      const uploadButton = page.getByRole('button', { name: /Upload new volumes table/i });
      await uploadButton.click();
      await expect(page).toHaveURL(/\/configuration\/upload-district-volume$/);
    });

    test('should navigate to upload page via direct URL @idir-only', async ({ page }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/configuration\/upload-district-volume$/);
      await expect(page.getByRole('heading', { name: 'Upload new volumes table' })).toBeVisible();
    });

    test('should display the upload form with all required fields @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      // Verify page content
      await expect(page.getByRole('heading', { name: 'Upload new volumes table' })).toBeVisible();
      await expect(
        page.getByText(
          'Load .csv or .xls file to calculate waste volumes when district averages waste assessment is used',
        ),
      ).toBeVisible();

      // Verify form fields
      await expect(page.getByText('Area')).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Coast' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Interior' })).toBeVisible();
      await expect(page.getByRole('textbox', { name: 'Start date' })).toBeVisible();
      await expect(page.getByTestId('file-upload-input')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cancel' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Upload table' })).toBeVisible();
    });

    test('should display the upload form via breadcrumb navigation @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      // Navigate back via breadcrumb
      const breadcrumbLink = page.getByRole('link', { name: 'District Volume Tables' });
      await breadcrumbLink.click();
      await expect(page).toHaveURL(/\/configuration\/district-volume-tables$/);
    });
  });

  test.describe('Non-admin role - Unauthorized access scenarios', () => {
    test('should not show Configuration link in side nav for non-admin users @bceid-only', async ({
      page,
    }) => {
      await page.goto('/search');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('side-nav-link-config')).toHaveCount(0);
    });

    test('should redirect to unauthorized page when non-admin user accesses upload page via direct URL @bceid-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'bceidbusiness',
        'cognito:groups': ['WASTE_PLUS_VIEWER_00147603'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/unauthorized/);
    });

    test('should redirect to unauthorized page when non-admin user navigates from search through config @bceid-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'bceidbusiness',
        'cognito:groups': ['WASTE_PLUS_VIEWER_00147603'],
      });

      await page.goto('/search');
      await page.waitForLoadState('domcontentloaded');

      // Try to access configuration (should redirect to unauthorized)
      await page.goto('/configuration');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/unauthorized/);
    });

    test('should display unauthorized page with appropriate message @bceid-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'bceidbusiness',
        'cognito:groups': ['WASTE_PLUS_VIEWER_00147603'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/unauthorized/);
      await expect(
        page.getByRole('heading', { name: /access denied|unauthorized/i }),
      ).toBeVisible();
    });
  });

  test.describe('Role-based access control validation', () => {
    test('should prevent IDIR users without ADMIN role from accessing upload page @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_SUBMITTER_00010005'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/unauthorized/);
    });

    test('should prevent BCeID users from accessing upload page even with ADMIN group @bceid-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'bceidbusiness',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/unauthorized/);
    });
  });
});
