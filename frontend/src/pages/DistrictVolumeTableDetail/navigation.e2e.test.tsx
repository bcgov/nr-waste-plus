import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

test.describe('District Volume Table Detail — Navigation & Access Control', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
  });

  // ─── Category A: Full Navigation Flow (Admin) ────────────────────────────

  test.describe('Full navigation flow (admin)', () => {
    test('should navigate to Interior detail page via full nav flow @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      // Mock the list and detail API endpoints
      await mockApiResponsesWithStub(
        page,
        'configuration/district-average-volumes**',
        'district-average-volumes/list.json',
      );
      await mockApiResponsesWithStub(
        page,
        'configuration/district-average-volumes/1',
        'district-average-volumes/interior-detail.json',
      );

      // Step 1: Go to search page
      await page.goto('/search');
      await page.waitForLoadState('domcontentloaded');

      // Step 2: Click side nav config link
      const configLink = page.getByTestId('side-nav-link-config');
      await expect(configLink).toBeVisible();
      await configLink.click();
      await expect(page).toHaveURL(/\/configuration$/);

      // Step 3: Click "View or update tables" link
      await page.getByRole('link', { name: /View or update tables/ }).click();
      await expect(page).toHaveURL(/\/configuration\/district-volume-tables$/);

      // Step 4: Click on the first Interior row's "See details" action (id=1, current)
      const interiorRow = page.getByRole('row').filter({ hasText: 'Interior' }).first();
      await interiorRow.getByRole('button', { name: 'See details' }).click();
      await expect(page).toHaveURL(/\/configuration\/district-volume-tables\/1/);

      // Step 5: Verify the detail page heading is visible
      await expect(page.getByRole('heading', { name: 'Volumes table: Interior' })).toBeVisible();
    });

    test('should navigate to Coast detail page via full nav flow @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      // Mock the list and detail API endpoints
      await mockApiResponsesWithStub(
        page,
        'configuration/district-average-volumes**',
        'district-average-volumes/list.json',
      );
      await mockApiResponsesWithStub(
        page,
        'configuration/district-average-volumes/4',
        'district-average-volumes/coast-detail.json',
      );

      // Step 1: Go to search page
      await page.goto('/search');
      await page.waitForLoadState('domcontentloaded');

      // Step 2: Click side nav config link
      const configLink = page.getByTestId('side-nav-link-config');
      await expect(configLink).toBeVisible();
      await configLink.click();
      await expect(page).toHaveURL(/\/configuration$/);

      // Step 3: Click "View or update tables" link
      await page.getByRole('link', { name: /View or update tables/ }).click();
      await expect(page).toHaveURL(/\/configuration\/district-volume-tables$/);

      // Step 4: Click on the first Coast row's "See details" action (id=4, current)
      const coastRow = page.getByRole('row').filter({ hasText: 'Coast' }).first();
      await coastRow.getByRole('button', { name: 'See details' }).click();
      await expect(page).toHaveURL(/\/configuration\/district-volume-tables\/4/);

      // Step 5: Verify the detail page heading is visible
      await expect(page.getByRole('heading', { name: 'Volumes table: Coastal' })).toBeVisible();
    });
  });

  // ─── Category B: Direct URL Access (Admin) ───────────────────────────────

  test.describe('Direct URL access (admin)', () => {
    test('should load Interior detail page via direct URL @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await mockApiResponsesWithStub(
        page,
        'configuration/district-average-volumes/1',
        'district-average-volumes/interior-detail.json',
      );

      await page.goto('/configuration/district-volume-tables/1');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/configuration\/district-volume-tables\/1/);
      await expect(page.getByRole('heading', { name: 'Volumes table: Interior' })).toBeVisible();
    });

    test('should load Coast detail page via direct URL @idir-only', async ({ page }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await mockApiResponsesWithStub(
        page,
        'configuration/district-average-volumes/4',
        'district-average-volumes/coast-detail.json',
      );

      await page.goto('/configuration/district-volume-tables/4');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/configuration\/district-volume-tables\/4/);
      await expect(page.getByRole('heading', { name: 'Volumes table: Coastal' })).toBeVisible();
    });
  });

  // ─── Category C: Role-Based Access Control ────────────────────────────────

  test.describe('Role-based access control', () => {
    test('should redirect non-admin to unauthorized when accessing detail via direct URL @bceid-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'bceidbusiness',
        'cognito:groups': ['WASTE_PLUS_VIEWER_00147603'],
      });

      await page.goto('/configuration/district-volume-tables/1');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/unauthorized/);
    });

    test('should not show Configuration link in side nav for non-admin users @bceid-only', async ({
      page,
    }) => {
      await page.goto('/search');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('side-nav-link-config')).toHaveCount(0);
    });
  });
});
