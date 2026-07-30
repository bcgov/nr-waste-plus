import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

test.describe('Species Composition Detail Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
  });

  test.describe('admin role (IDIR)', () => {
    test('should load detail page via direct URL @idir-only', async ({ page }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/42');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/configuration\/species-composition\/42/);
    });

    test('should display correct page content @idir-only', async ({ page }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await mockApiResponsesWithStub(
        page,
        'configuration/species-compositions/42',
        'species-composition/detail.json',
      );

      await page.goto('/configuration/species-composition/42');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByRole('heading', { name: 'Species composition table' })).toBeVisible();
      await expect(page.getByText('View species composition table details')).toBeVisible();
    });

    test('should display species composition metadata header @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await mockApiResponsesWithStub(
        page,
        'configuration/species-compositions/42',
        'species-composition/detail.json',
      );

      await page.goto('/configuration/species-composition/42');
      await page.waitForLoadState('domcontentloaded');

      // Header label
      await expect(page.getByText('Start date')).toBeVisible();

      // Header value from stub
      await expect(page.getByText('June 01, 2026')).toBeVisible();
    });

    test('should display district × species matrix table @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await mockApiResponsesWithStub(
        page,
        'configuration/species-compositions/42',
        'species-composition/detail.json',
      );
      await mockApiResponsesWithStub(page, 'codes/districts', 'codes/districts.json');

      await page.goto('/configuration/species-composition/42');
      await page.waitForLoadState('domcontentloaded');

      // District column codes with tooltip (full description visible on hover via TooltipTag)
      // Use getByText('DCC') not getByRole('cell', { name: 'DCC' }) — the Carbon
      // Tooltip trigger element (role="button") inside the cell consumes the text
      // for its own accessible name, so the cell's accessible name is empty.
      await expect(page.getByText('DCC')).toBeVisible();
      await expect(page.getByText('DCS')).toBeVisible();

      // Species column headers (2-letter codes)
      // Use { exact: true } to avoid matching "Configuration", "Coast", "Species composition", etc.
      await expect(page.getByText('CO', { exact: true })).toBeVisible();
      await expect(page.getByText('SP', { exact: true })).toBeVisible();

      // Species values from stub data (DCC row)
      // Use getByRole('cell') to avoid strict mode violation from getByText
      // matching both the <td> and its parent <tr>
      await expect(page.getByRole('cell', { name: '43' })).toBeVisible();
      await expect(page.getByRole('cell', { name: '52' })).toBeVisible();
    });

    test('should navigate back to configuration via breadcrumb @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/42');
      await page.waitForLoadState('domcontentloaded');

      // Scope to the breadcrumb container to avoid matching side nav links
      const breadcrumb = page.locator('.page-title-breadcrumb');
      await breadcrumb.getByText('Configuration').click();

      await expect(page).toHaveURL(/\/configuration$/);
    });

    test('should navigate to list page via species composition breadcrumb @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/42');
      await page.waitForLoadState('domcontentloaded');

      // Scope to the breadcrumb container to avoid matching side nav links
      const breadcrumb = page.locator('.page-title-breadcrumb');
      await breadcrumb.getByText('Species composition').click();

      await expect(page).toHaveURL(/\/configuration\/species-composition$/);
    });
  });

  test.describe('non-admin role', () => {
    test('should redirect to unauthorized when non-admin user accesses detail via direct URL @bceid-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'bceidbusiness',
        'cognito:groups': ['WASTE_PLUS_VIEWER_00147603'],
      });

      await page.goto('/configuration/species-composition/42');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/unauthorized/);
    });
  });
});
