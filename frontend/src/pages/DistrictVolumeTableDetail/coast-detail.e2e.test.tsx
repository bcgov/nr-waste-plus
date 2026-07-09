import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

test.describe('District Volume Table Detail — Coast View', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
    await mockJwt(page, testInfo.project.metadata, {
      'custom:idp_name': 'idir',
      'cognito:groups': ['WASTE_PLUS_ADMIN'],
    });
    await mockApiResponsesWithStub(
      page,
      'configuration/district-average-volumes/4',
      'district-average-volumes/coast-detail.json',
    );
  });

  // ─── E1: Page Title ──────────────────────────────────────────────────────

  test('should display correct page title for Coast @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/4');
    await page.waitForLoadState('domcontentloaded');

    // normalizeText("COASTAL") → "Coastal"
    await expect(page.getByRole('heading', { name: 'Volumes table: Coastal' })).toBeVisible();
  });

  // ─── E2: Header Fields ──────────────────────────────────────────────────

  test('should display header fields including Heli multiplier for Coast @idir-only', async ({
    page,
  }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/4');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Start date')).toBeVisible();
    await expect(page.getByText('Dispersed retention reduction factor')).toBeVisible();
    await expect(page.getByText('Heli multiplier')).toBeVisible();
  });

  // ─── E3: Heli Multiplier Value ──────────────────────────────────────────

  test('should display Heli multiplier value @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/4');
    await page.waitForLoadState('domcontentloaded');

    // PrecisionNumberTag renders heliMultiplier (3.47) with precision=3 → "3.47"
    await expect(page.getByText('3.47')).toBeVisible();
  });

  // ─── E4: Section Tabs ───────────────────────────────────────────────────

  test('should render section tabs for Coast @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/4');
    await page.waitForLoadState('domcontentloaded');

    // Use exact: true because "Mature" is a substring of "Immature"
    await expect(page.getByRole('tab', { name: 'Mature', exact: true })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Immature', exact: true })).toBeVisible();
  });

  // ─── E5: Default Mature Tab ─────────────────────────────────────────────

  test('should show Mature tab data by default @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/4');
    await page.waitForLoadState('domcontentloaded');

    // Mature tab is selected by default (defaultSelectedIndex={0})
    await expect(page.getByRole('tab', { name: 'Mature', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );

    // Scope to the Mature section to avoid strict mode violation from Immature panel
    const matureSection = page.getByTestId('district-zone-Mature');
    await expect(matureSection.getByText('DCK')).toBeVisible();
    await expect(matureSection.getByText('DCR')).toBeVisible();

    // Table headers visible
    await expect(matureSection.getByText('District')).toBeVisible();
  });

  // ─── E6: Switch to Immature Tab ─────────────────────────────────────────

  test('should switch to Immature tab @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/4');
    await page.waitForLoadState('domcontentloaded');

    // Click Immature tab
    await page.getByRole('tab', { name: 'Immature' }).click();

    // DNI (Immature district) should be visible
    await expect(page.getByText('DNI')).toBeVisible();

    // DCK (Mature district) should NOT be visible
    await expect(page.getByText('DCK')).not.toBeVisible();
  });

  // ─── E7: Table Column Headers ───────────────────────────────────────────

  test('should display Coast table column headers @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/4');
    await page.waitForLoadState('domcontentloaded');

    // Default Mature tab — verify all column headers (Coast has 6 columns)
    // Scope to the Mature section to avoid strict mode violation from Immature panel
    const matureSection = page.getByTestId('district-zone-Mature');
    await expect(matureSection.getByText('District')).toBeVisible();
    await expect(matureSection.getByText('Avoidable sawlog')).toBeVisible();
    await expect(matureSection.getByText('Avoidable Hembal Grade U')).toBeVisible();
    await expect(matureSection.getByText('Avoidable Grade Y')).toBeVisible();
    await expect(matureSection.getByText('Unavoidable')).toBeVisible();
    await expect(matureSection.getByText('Total')).toBeVisible();
  });

  // ─── E8: District Data Values ───────────────────────────────────────────

  test('should display Coast district data values @idir-only', async ({ page }) => {
    test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

    await page.goto('/configuration/district-volume-tables/4');
    await page.waitForLoadState('domcontentloaded');

    // Default Mature tab — verify DCK row values
    // Scope to the Mature section to avoid strict mode violation from Immature panel
    // PrecisionNumberTag renders with precision=3: 2.345, 1.234, 0.567, 0.123, 4.269
    const matureSection = page.getByTestId('district-zone-Mature');
    await expect(matureSection.getByText('2.345')).toBeVisible();
    await expect(matureSection.getByText('1.234')).toBeVisible();
    await expect(matureSection.getByText('0.567')).toBeVisible();
    await expect(matureSection.getByText('0.123')).toBeVisible();
    await expect(matureSection.getByText('4.269')).toBeVisible();
  });
});
