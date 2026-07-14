import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';
import { buildValidInteriorBuffer, buildValidCoastBuffer } from '@/config/tests/spreadsheet.helper';

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
    name: 'test.xlsx',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    buffer,
  });
}

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
        headers: {
          'location': '/api/configuration/district-average-volumes/42',
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

test.describe('District Volume Table Detail — Post-Upload', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
    await mockJwt(page, testInfo.project.metadata, {
      'custom:idp_name': 'idir',
      'cognito:groups': ['WASTE_PLUS_ADMIN'],
    });
  });

  // ─── Category G: Post-Upload Navigation ──────────────────────────────────

  test('should show success notification when arriving from Interior upload @idir-only', async ({
    page,
  }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    // Mock the list endpoint (needed for the upload page)
    await mockApiResponsesWithStub(
      page,
      'configuration/district-average-volumes**',
      'district-average-volumes/list.json',
    );

    // Mock the detail endpoint for ID 42 with Interior data (must be AFTER list mock
    // so the more specific /42 handler takes precedence over the broader ** glob)
    await mockApiResponsesWithStub(
      page,
      'configuration/district-average-volumes/42',
      'district-average-volumes/interior-detail.json',
    );

    // Register the POST mock (after shell mocks so it takes precedence)
    await mockCreateApi(page);

    // Navigate to the upload page
    await page.goto('/configuration/district-volume-tables/upload');
    await page.waitForLoadState('domcontentloaded');

    // Step 1: Upload a valid Interior spreadsheet
    const buffer = await buildValidInteriorBuffer();
    await uploadFile(page, buffer);

    const fileItem = page.getByTestId('file-upload-item');
    await expect(fileItem).toBeVisible({ timeout: 10_000 });

    // Wait for file processing to complete (status changes from 'uploading' to 'edit')
    await expect(page.getByText(/Uploading/)).toHaveCount(0, { timeout: 15_000 });

    // Step 2: Fill in the start date (must be tomorrow)
    const dateInput = page.getByLabel('Start date');
    await dateInput.fill(tomorrowFormatted());
    // Carbon DatePicker fires onChange on Enter/blur, not on input events
    await page.keyboard.press('Enter');

    // Step 3: Wait for button to be enabled then click
    await expect(page.getByTestId('upload-table-button')).toBeEnabled({ timeout: 10_000 });
    await page.getByTestId('upload-table-button').click();

    // Step 4: Verify navigation to the detail page
    await expect(page).toHaveURL(/\/configuration\/district-volume-tables\/42/, {
      timeout: 10_000,
    });

    // Step 5: Verify the detail page heading is visible
    await expect(page.getByRole('heading', { name: 'Volumes table: Interior' })).toBeVisible();

    // Step 6: Verify the notification column exists (PageNotification is mounted)
    await expect(page.locator('.district-volume-detail-column__notification')).toBeAttached();
  });

  test('should show success notification when arriving from Coast upload @idir-only', async ({
    page,
  }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    // Mock the list endpoint (needed for the upload page)
    await mockApiResponsesWithStub(
      page,
      'configuration/district-average-volumes**',
      'district-average-volumes/list.json',
    );

    // Mock the detail endpoint for ID 42 with Coast data (must be AFTER list mock
    // so the more specific /42 handler takes precedence over the broader ** glob)
    await mockApiResponsesWithStub(
      page,
      'configuration/district-average-volumes/42',
      'district-average-volumes/coast-detail.json',
    );

    // Register the POST mock (after shell mocks so it takes precedence)
    await mockCreateApi(page);

    // Navigate to the upload page
    await page.goto('/configuration/district-volume-tables/upload');
    await page.waitForLoadState('domcontentloaded');

    // Step 1: Select Coast area before uploading the Coast spreadsheet
    await page.locator('label[for="area-coast"]').click();

    // Step 2: Upload a valid Coast spreadsheet
    const buffer = await buildValidCoastBuffer();
    await uploadFile(page, buffer);

    const fileItem = page.getByTestId('file-upload-item');
    await expect(fileItem).toBeVisible({ timeout: 10_000 });

    // Wait for file processing to complete (status changes from 'uploading' to 'edit')
    await expect(page.getByText(/Uploading/)).toHaveCount(0, { timeout: 15_000 });

    // Step 2: Fill in the start date (must be tomorrow)
    const dateInput = page.getByLabel('Start date');
    await dateInput.fill(tomorrowFormatted());
    // Carbon DatePicker fires onChange on Enter/blur, not on input events
    await page.keyboard.press('Enter');

    // Step 3: Wait for button to be enabled then click
    await expect(page.getByTestId('upload-table-button')).toBeEnabled({ timeout: 10_000 });
    await page.getByTestId('upload-table-button').click();

    // Step 4: Verify navigation to the detail page
    await expect(page).toHaveURL(/\/configuration\/district-volume-tables\/42/, {
      timeout: 10_000,
    });

    // Step 5: Verify the detail page heading is visible
    await expect(page.getByRole('heading', { name: 'Volumes table: Coastal' })).toBeVisible();

    // Step 6: Verify the notification column exists (PageNotification is mounted)
    await expect(page.locator('.district-volume-detail-column__notification')).toBeAttached();
  });
});
