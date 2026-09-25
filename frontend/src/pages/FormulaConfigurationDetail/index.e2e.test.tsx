import { test, expect } from '@playwright/test';

import type { FormulaSetResponse } from '@/services/formulaConfiguration.types';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponses } from '@/config/tests/e2e.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

/**
 * Detail payload contract: declaredVariables and validationErrors are excluded
 * from the backend response and therefore never surface in the UI.
 */
const detailResponse: FormulaSetResponse = {
  id: 10,
  area: 'INTERIOR',
  startDate: '2026-06-01',
  endDate: null,
  deleted: false,
  formulas: [
    {
      formulaKey: 'da.mature.avoidableGradeY',
      expression: 'da.mature.merchantableVolume * 0.15',
      sortOrder: 0,
    },
  ],
  createdAt: '2026-05-15T14:23:00Z',
  updatedAt: '2026-05-15T14:23:00Z',
};

test.describe('Formula Configuration Detail Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
  });

  test.describe('admin role (IDIR)', () => {
    test('should render the detail with renamed classes and an Open-ended end date @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await mockApiResponses(
        page,
        'configuration/formulas/10',
        200,
        'application/json',
        detailResponse,
      );

      await page.goto('/configuration/formulas/10');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByRole('heading', { name: 'Formula set: Interior' })).toBeVisible();

      // FR1: renamed detail header classes; legacy district-volume-detail__* is gone
      await expect(page.locator('.formula-set-detail__start-date')).toBeVisible();
      await expect(page.locator('.formula-set-detail__end-date')).toBeVisible();
      await expect(page.locator('.district-volume-detail__start-date')).toHaveCount(0);
      await expect(page.locator('.district-volume-detail__end-date')).toHaveCount(0);

      // endDate null → Open-ended fallback instead of a DateTag
      await expect(page.getByText('Open-ended').first()).toBeVisible();

      // Read-only formula expression renders; payload field names never surface
      await expect(page.getByText('da.mature.merchantableVolume * 0.15')).toBeVisible();
      await expect(page.getByText('declaredVariables')).toHaveCount(0);
      await expect(page.getByText('validationErrors')).toHaveCount(0);
    });

    test('should navigate back to the formula list via the Back button @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await mockApiResponses(
        page,
        'configuration/formulas/10',
        200,
        'application/json',
        detailResponse,
      );

      await page.goto('/configuration/formulas/10');
      await page.waitForLoadState('domcontentloaded');

      await page.getByRole('button', { name: 'Back' }).click();

      await expect(page).toHaveURL(/\/configuration\/formulas$/);
      await expect(page.getByRole('heading', { name: 'Formula Configuration' })).toBeVisible();
    });
  });
});
