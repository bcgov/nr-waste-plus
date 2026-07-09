import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

test.describe('District Volume Table Detail — Interior View', () => {
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

  // ─── D1: Page Title ─────────────────────────────────────────────────────

  test('should display correct page title for Interior @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('heading', { name: 'Volumes table: Interior' })).toBeVisible();
  });

  // ─── D2: Header Fields ──────────────────────────────────────────────────

  test('should display header fields for Interior @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Start date')).toBeVisible();
    await expect(page.getByText('Dispersed retention reduction factor')).toBeVisible();
  });

  // ─── D3: Start Date Value ───────────────────────────────────────────────

  test('should display start date value @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/1');
    await page.waitForLoadState('domcontentloaded');

    // DateTag renders "2026-06-01" as "June 01, 2026" with format "MMMM dd, yyyy"
    await expect(page.getByText('June 01, 2026')).toBeVisible();
  });

  // ─── D4: Zone Tabs ──────────────────────────────────────────────────────

  test('should render zone tabs for Interior @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/1');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByRole('tab', { name: 'Dry belt' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Transition zone' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Wet belt' })).toBeVisible();
  });

  // ─── D5: Default Dry Belt Tab ───────────────────────────────────────────

  test('should show Dry belt tab data by default @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/1');
    await page.waitForLoadState('domcontentloaded');

    // Dry belt tab is selected by default (defaultSelectedIndex={0})
    await expect(page.getByRole('tab', { name: 'Dry belt' })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    const dryBeltSection = page.getByTestId('district-zone-Dry belt');

    // Dry belt district codes visible
    await expect(dryBeltSection.getByText('DCC')).toBeVisible();
    await expect(dryBeltSection.getByText('DCS')).toBeVisible();

    // Table headers visible (use exact matching to avoid "Avoidable Grade 4"
    // matching "Unavoidable Grade 4" as a substring)
    await expect(dryBeltSection.getByText('District', { exact: true })).toBeVisible();
    await expect(dryBeltSection.getByText('Avoidable sawlog', { exact: true })).toBeVisible();
  });

  // ─── D6: Switch to Transition Zone Tab ──────────────────────────────────

  test('should switch to Transition zone tab @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/1');
    await page.waitForLoadState('domcontentloaded');

    // Click Transition zone tab
    await page.getByRole('tab', { name: 'Transition zone' }).click();

    // DFN (Transition zone district) should be visible
    await expect(page.getByText('DFN')).toBeVisible();

    // DCC (Dry belt district) should NOT be visible
    await expect(page.getByText('DCC')).not.toBeVisible();
  });

  // ─── D7: Switch to Wet Belt Tab ─────────────────────────────────────────

  test('should switch to Wet belt tab @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/1');
    await page.waitForLoadState('domcontentloaded');

    // Click Wet belt tab
    await page.getByRole('tab', { name: 'Wet belt' }).click();

    // DKA (Wet belt district) should be visible
    await expect(page.getByText('DKA')).toBeVisible();
  });

  // ─── D8: Table Column Headers ───────────────────────────────────────────

  test('should display Interior table column headers @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/1');
    await page.waitForLoadState('domcontentloaded');

    const dryBeltSection = page.getByTestId('district-zone-Dry belt');

    // Default Dry belt tab — verify all column headers (use exact matching to
    // avoid "Avoidable Grade 4" matching "Unavoidable Grade 4" as a substring)
    await expect(dryBeltSection.getByText('District', { exact: true })).toBeVisible();
    await expect(dryBeltSection.getByText('Avoidable sawlog', { exact: true })).toBeVisible();
    await expect(dryBeltSection.getByText('Avoidable Grade 4', { exact: true })).toBeVisible();
    await expect(dryBeltSection.getByText('Unavoidable Grade 4', { exact: true })).toBeVisible();
    await expect(dryBeltSection.getByText('Total', { exact: true })).toBeVisible();
  });

  // ─── D9: District Data Values ───────────────────────────────────────────

  test('should display district data values in Interior table @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/1');
    await page.waitForLoadState('domcontentloaded');

    // Default Dry belt tab — verify DCC row values
    // PrecisionNumberTag renders with precision=3: 1.234, 0.567, 0.123, 1.924
    await expect(page.getByText('1.234')).toBeVisible();
    await expect(page.getByText('0.567')).toBeVisible();
    await expect(page.getByText('0.123')).toBeVisible();
    await expect(page.getByText('1.924')).toBeVisible();
  });
});
