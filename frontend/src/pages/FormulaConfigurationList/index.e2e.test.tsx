import { test, expect } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

test.describe('Formula Configuration List Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
  });

  test.describe('admin role (IDIR)', () => {
    test('should render the list with renamed column classes @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await mockApiResponsesWithStub(
        page,
        'configuration/formulas**',
        'configuration/formulas/list.json',
      );

      await page.goto('/configuration/formulas');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByRole('heading', { name: 'Formula Configuration' })).toBeVisible();

      // FR1: renamed list column class renders; legacy configuration-column__* is gone
      await expect(page.locator('.formula-set-list-column__content').first()).toBeVisible();
      await expect(page.locator('[class*="configuration-column__"]')).toHaveCount(0);

      // Stub rows: interior and coastal formula sets are listed
      await expect(page.getByText('Interior', { exact: true }).first()).toBeVisible();
      await expect(page.getByText('Coastal', { exact: true }).first()).toBeVisible();
    });

    test('should render a placeholder for a null end date @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await mockApiResponsesWithStub(
        page,
        'configuration/formulas**',
        'configuration/formulas/list.json',
      );

      await page.goto('/configuration/formulas');
      await page.waitForLoadState('domcontentloaded');

      // Formula set id 5 (start 2099-09-11, endDate null) renders the '-' placeholder
      // (TableResource.renderCell short-circuits null values to '-' before renderAs).
      const openEndedRow = page.getByRole('row').filter({ hasText: 'September 11, 2099' });
      await expect(openEndedRow).toBeVisible();
      await expect(openEndedRow.getByRole('cell', { name: '-', exact: true })).toBeVisible();
    });
  });
});
