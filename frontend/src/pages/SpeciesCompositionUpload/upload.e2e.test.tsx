import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import {
  buildValidSpeciesCompositionBuffer,
  buildMissingDistrictsBuffer,
  buildSpeciesNonNumericBuffer,
  buildSpeciesOutOfRangeBuffer,
} from '@/config/tests/spreadsheet.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Uploads a file via Carbon's hidden `<input class="cds--file-input">`.
 * Uses `setInputFiles()` directly instead of clicking the dropzone button,
 * because Carbon's dropzone button does not reliably trigger Playwright's
 * filechooser event.
 */
async function uploadFile(page: import('@playwright/test').Page, buffer: Buffer): Promise<void> {
  const input = page.locator('.cds--file-input');
  await input.setInputFiles({
    name: 'species_composition.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });
}

/**
 * Mocks the POST endpoint for species composition creation so the form can submit
 * without a real backend. Returns a `location` header with a fake resource ID.
 *
 * Must be registered AFTER `beforeEach` shell mocks so it takes precedence
 * (Playwright runs the last-registered route handler first).
 */
async function mockCreateApi(page: import('@playwright/test').Page): Promise<void> {
  await page.route('**/api/configuration/species-compositions', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        headers: {
          'location': '/api/configuration/species-compositions/42',
          // CORS expose — without this, Axios can't read the `location` header
          // from `xhr.getAllResponseHeaders()` for cross-origin requests.
          'access-control-expose-headers': 'location',
        },
      });
    } else {
      await route.continue();
    }
  });
}

// ─── Test Suite ──────────────────────────────────────────────────────────────

test.describe('Species Composition Upload Page - E2E', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
  });

  // ─── Navigation & Role Access Tests ─────────────────────────────────────

  test.describe('Navigation (admin role)', () => {
    test('should land on upload page via direct URL @idir-only', async ({ page }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/configuration\/species-composition\/upload$/);
      await expect(
        page.getByRole('heading', { name: 'Upload new species composition table' }),
      ).toBeVisible();
    });

    test('should display correct page content @idir-only', async ({ page }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      await expect(
        page.getByText('Load .xls or .xlsx file to calculate volumes by species'),
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

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      // Scope to the breadcrumb container to avoid matching side nav links
      const breadcrumb = page.locator('.page-title-breadcrumb');
      await breadcrumb.getByText('Configuration').click();

      await expect(page).toHaveURL(/\/configuration$/);
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

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(/\/unauthorized/);
    });
  });

  // ─── Spreadsheet Upload Tests ───────────────────────────────────────────

  test.describe('Spreadsheet upload — valid files', () => {
    test('should upload a valid species composition spreadsheet and show review table @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      // Upload a valid species composition spreadsheet
      const buffer = await buildValidSpeciesCompositionBuffer();
      await uploadFile(page, buffer);

      // Wait for processing to complete: the file uploader item appears with a delete button
      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });

      // Wait for file processing to complete (status changes from 'uploading' to 'edit')
      await expect(page.getByText(/Uploading/)).toHaveCount(0, { timeout: 15_000 });

      // The review table should be visible with district rows
      const reviewTable = page.getByTestId('species-composition-review-table');
      await expect(reviewTable).toBeVisible();

      // The upload button should be enabled
      await expect(page.getByTestId('upload-table-button')).toBeEnabled();

      // No file-level error messages should be displayed
      await expect(page.getByTestId('file-error')).toHaveCount(0);
    });
  });

  test.describe('Spreadsheet upload — invalid files', () => {
    test('should show error when uploading a file with missing districts @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      const buffer = await buildMissingDistrictsBuffer();
      await uploadFile(page, buffer);

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

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      const buffer = await buildSpeciesNonNumericBuffer();
      await uploadFile(page, buffer);

      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });
      await expect(fileItem).toHaveClass(/invalid/);
    });

    test('should show error when uploading a file with out-of-range values @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      const buffer = await buildSpeciesOutOfRangeBuffer();
      await uploadFile(page, buffer);

      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });
      await expect(fileItem).toHaveClass(/invalid/);
    });
  });

  // ─── Review Table Tests ─────────────────────────────────────────────────

  test.describe('Review table display', () => {
    test('should display review table with correct district rows after valid upload @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      const buffer = await buildValidSpeciesCompositionBuffer();
      await uploadFile(page, buffer);

      // Wait for processing to complete
      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/Uploading/)).toHaveCount(0, { timeout: 15_000 });

      // Review table should be visible
      const reviewTable = page.getByTestId('species-composition-review-table');
      await expect(reviewTable).toBeVisible();

      // Should display district codes in the table (23 data rows + 1 header row)
      // Carbon DataTable renders <tr> elements inside <tbody> for data rows
      const dataRows = reviewTable.locator('tbody tr');
      await expect(dataRows).toHaveCount(23, { timeout: 5_000 });
    });

    test('should hide review table when no data is loaded @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      // Review table should NOT be visible initially
      const reviewTable = page.getByTestId('species-composition-review-table');
      await expect(reviewTable).not.toBeVisible();
    });
  });

  // ─── Button State Tests ─────────────────────────────────────────────────

  test.describe('Button states', () => {
    test('should disable upload button when no data is loaded @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      // Upload button should be disabled initially
      await expect(page.getByTestId('upload-table-button')).toBeDisabled();
    });

    test('should enable upload button after valid file upload @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      const buffer = await buildValidSpeciesCompositionBuffer();
      await uploadFile(page, buffer);

      // Wait for processing to complete
      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/Uploading/)).toHaveCount(0, { timeout: 15_000 });

      // Upload button should now be enabled
      await expect(page.getByTestId('upload-table-button')).toBeEnabled();
    });

    test('should have a visible cancel button @idir-only', async ({ page }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByTestId('cancel-button')).toBeVisible();
    });
  });

  // ─── Cancel Navigation Tests ────────────────────────────────────────────

  test.describe('Cancel navigation', () => {
    test('should navigate back to species composition list when cancel is clicked @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      await page.getByTestId('cancel-button').click();

      await expect(page).toHaveURL(/\/configuration\/species-composition$/, { timeout: 10_000 });
    });
  });

  // ─── Full Submission Flow Tests ─────────────────────────────────────────

  test.describe('Full submission flow', () => {
    test('should upload valid file, review table, and submit successfully @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      // Register the POST mock (after beforeEach so it takes precedence)
      await mockCreateApi(page);

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      // Step 1: Upload a valid species composition spreadsheet
      const buffer = await buildValidSpeciesCompositionBuffer();
      await uploadFile(page, buffer);

      // Wait for processing to complete
      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/Uploading/)).toHaveCount(0, { timeout: 15_000 });

      // Step 2: Verify review table is displayed
      const reviewTable = page.getByTestId('species-composition-review-table');
      await expect(reviewTable).toBeVisible();

      // Step 3: Wait for button to be enabled then click
      await expect(page.getByTestId('upload-table-button')).toBeEnabled({ timeout: 10_000 });
      await page.getByTestId('upload-table-button').click();

      // Step 4: Verify navigation to the details page
      await expect(page).toHaveURL(/\/configuration\/species-composition\/42/, {
        timeout: 10_000,
      });
    });

    test('should show error when API returns 500 during submission @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      // Mock a 500 error from the create API
      await page.route('**/api/configuration/species-compositions', async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/problem+json',
            body: JSON.stringify({
              status: 500,
              title: 'Internal Server Error',
              detail: 'Something went wrong.',
            }),
          });
        } else {
          await route.continue();
        }
      });

      await page.goto('/configuration/species-composition/upload');
      await page.waitForLoadState('domcontentloaded');

      // Upload a valid file
      const buffer = await buildValidSpeciesCompositionBuffer();
      await uploadFile(page, buffer);

      // Wait for processing to complete
      const fileItem = page.getByTestId('file-upload-item');
      await expect(fileItem).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/Uploading/)).toHaveCount(0, { timeout: 15_000 });

      // Click upload
      await expect(page.getByTestId('upload-table-button')).toBeEnabled({ timeout: 10_000 });
      await page.getByTestId('upload-table-button').click();

      // Should show an error notification (Carbon toast or inline error)
      // The mutation error handler should display a notification
      // Use .first() because Carbon may render multiple alert elements
      await expect(page.getByRole('alert').first()).toBeVisible({ timeout: 10_000 });

      // Should remain on the upload page
      await expect(page).toHaveURL(/\/configuration\/species-composition\/upload$/);
    });
  });
});
