import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';
import { mockJwt } from '@/config/tests/auth.helper';
import {
  buildValidInteriorBuffer,
  buildValidCoastBuffer,
  buildWrongSheetNameBuffer,
  buildNonNumericDataBuffer,
  buildInvalidDistrictCodeBuffer,
  buildMissingHeliMultiplierBuffer,
} from '@/config/tests/spreadsheet.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Calculates tomorrow's date formatted as yyyy/mm/dd for the Carbon date picker.
 */
function tomorrowFormatted(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}/${m}/${day}`;
}

/**
 * Mocks the POST endpoint for district volume creation so the form can submit
 * without a real backend. Returns a `location` header with a fake resource ID.
 *
 * Must be registered AFTER `beforeEach` shell mocks so it takes precedence
 * (Playwright runs the last-registered route handler first).
 */
async function mockCreateApi(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/configuration/district-average-volumes', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        headers: { location: '/api/configuration/district-average-volumes/42' },
      });
    } else {
      await route.continue(); // let the existing mock handler deal with GET
    }
  });
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe('District Volume Table Upload Page - E2E', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
    await mockApiResponsesWithStub(
      page,
      'configuration/district-average-volumes**',
      'district-average-volumes/list.json',
    );
  });

  // ─── Navigation & Role Access Tests ─────────────────────────────────────

  test.describe('Navigation (admin role)', () => {
    test('should navigate to upload page via side nav and config page @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/search');
      await page.waitForLoadState('domcontentloaded');

      // Click the side-nav config link
      await page.getByTestId('side-nav-link-config').click();
      await expect(page).toHaveURL(/\/configuration$/);

      // Click the "View or update tables" button
      await page.getByRole('button', { name: /View or update tables/i }).click();
      await expect(page).toHaveURL(/\/configuration\/district-volume-tables$/);

      // Click the upload button
      await page.getByRole('button', { name: /Upload new volumes table/i }).click();
      await expect(page).toHaveURL(/\/configuration\/upload-district-volume$/);
    });

    test('should land on upload page via direct URL @idir-only', async ({ page }, testInfo) => {
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
  });

  test.describe('Role-based access control', () => {
    test('should redirect non-admin user to unauthorized when accessing via direct URL @bceid-only', async ({
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

    test('should redirect non-admin user when navigating via config page @bceid-only', async ({
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
  });

  // ─── Spreadsheet Upload Tests ───────────────────────────────────────────

  test.describe('Spreadsheet upload — valid files', () => {
    test('should upload a valid Interior spreadsheet and update the form @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      // Upload a valid Interior spreadsheet
      const buffer = await buildValidInteriorBuffer();
      const fileInput = page.getByTestId('file-upload-dropzone').locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'interior-test.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      });

      // Wait for processing to complete: the file uploader item appears with a delete button
      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });

      // The Interior radio should remain selected (default is Interior, upload data is Interior)
      await expect(page.getByLabel('Interior')).toBeChecked();

      // The radio group should be visible
      await expect(page.getByTestId('area-radio-group')).toBeVisible();

      // No file-level error messages should be displayed
      await expect(page.getByTestId('file-error')).toHaveCount(0);
    });

    test('should upload a valid Coast spreadsheet and update the form @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      // Upload a valid Coast spreadsheet
      const buffer = await buildValidCoastBuffer();
      const fileInput = page.getByTestId('file-upload-dropzone').locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'coast-test.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      });

      // Wait for processing to complete
      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });

      // The Coast radio should now be selected (file data overrides the default)
      await expect(page.getByLabel('Coast')).toBeChecked();

      // The radio group should be visible
      await expect(page.getByTestId('area-radio-group')).toBeVisible();

      // No file-level error messages should be displayed
      await expect(page.getByTestId('file-error')).toHaveCount(0);
    });
  });

  test.describe('Spreadsheet upload — invalid files', () => {
    test('should show error when uploading a file with wrong sheet name @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      const buffer = await buildWrongSheetNameBuffer();
      const fileInput = page.getByTestId('file-upload-dropzone').locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'wrong-sheet.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      });

      // Wait for the file item to appear with an error state
      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });

      // The file item should have the invalid class
      await expect(fileItem).toHaveClass(/invalid/);
    });

    test('should show error when uploading a file with non-numeric data @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      const buffer = await buildNonNumericDataBuffer();
      const fileInput = page.getByTestId('file-upload-dropzone').locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'bad-data.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      });

      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });
      await expect(fileItem).toHaveClass(/invalid/);
    });

    test('should show error when uploading a file with invalid district code @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      const buffer = await buildInvalidDistrictCodeBuffer();
      const fileInput = page.getByTestId('file-upload-dropzone').locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'bad-code.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      });

      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });
      await expect(fileItem).toHaveClass(/invalid/);
    });

    test('should show error when uploading a Coast file missing heli multiplier @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      const buffer = await buildMissingHeliMultiplierBuffer();
      const fileInput = page.getByTestId('file-upload-dropzone').locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'no-heli.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      });

      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });
      await expect(fileItem).toHaveClass(/invalid/);
    });
  });

  test.describe('Spreadsheet upload — full submission flow', () => {
    test('should upload valid Interior, fill date, and submit successfully @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      // Register the POST mock (after beforeEach so it takes precedence)
      await mockCreateApi(page);

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      // Step 1: Upload a valid Interior spreadsheet
      const buffer = await buildValidInteriorBuffer();
      const fileInput = page.getByTestId('file-upload-dropzone').locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'interior-valid.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      });

      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });

      // Step 2: Fill in the start date (must be tomorrow)
      const dateInput = page.getByLabel('Start date');
      await dateInput.fill(tomorrowFormatted());

      // Step 3: Click the Upload table button
      await page.getByRole('button', { name: 'Upload table' }).click();

      // Step 4: Verify navigation to the details page
      await expect(page).toHaveURL(/\/configuration\/district-volume-tables\/42/, {
        timeout: 10_000,
      });
    });

    test('should upload valid Coast, fill date, and submit successfully @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await mockCreateApi(page);

      await page.goto('/configuration/upload-district-volume');
      await page.waitForLoadState('domcontentloaded');

      // Step 1: Upload a valid Coast spreadsheet
      const buffer = await buildValidCoastBuffer();
      const fileInput = page.getByTestId('file-upload-dropzone').locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'coast-valid.xlsx',
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        buffer,
      });

      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });

      // Step 2: Fill in the start date (must be tomorrow)
      const dateInput = page.getByLabel('Start date');
      await dateInput.fill(tomorrowFormatted());

      // Step 3: Click the Upload table button
      await page.getByRole('button', { name: 'Upload table' }).click();

      // Step 4: Verify navigation to the details page
      await expect(page).toHaveURL(/\/configuration\/district-volume-tables\/42/, {
        timeout: 10_000,
      });
    });
  });
});
