import { expect } from '@playwright/test';

import { setupWasteSearchMocks } from './e2e.setup';

import { test } from '@/config/tests/coverage.setup';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Waste Search - URL-Populated Filters', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupWasteSearchMocks(page, testInfo.project.metadata.userType, {
      includeSearchRoutes: true,
    });
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
  });

  test('fills main search term from URL', async ({ page }) => {
    const term = 'RANDOM-TERM-123';

    await page.goto(`/search?mainSearchTerm=${encodeURIComponent(term)}`);
    await page.waitForLoadState('networkidle');

    const searchBox = page.getByRole('searchbox');
    await expect(searchBox).toHaveValue(term);
  });

  test('fills district with one value from URL', async ({ page }) => {
    await page.goto('/search?district=DFN');
    await page.waitForLoadState('networkidle');

    const districtInput = page.locator('#district-multi-select-input');
    await expect(page.getByTestId('dt-district-DFN')).toBeVisible();
    await expect(districtInput).toHaveAttribute('placeholder', 'DFN');
  });

  test('fills district with multiple values from URL', async ({ page }) => {
    await page.goto('/search?district=DFN,DCK');
    await page.waitForLoadState('networkidle');

    const districtInput = page.locator('#district-multi-select-input');
    await expect(page.getByTestId('dt-district-DFN')).toBeVisible();
    await expect(page.getByTestId('dt-district-DCK')).toBeVisible();
    await expect(districtInput).toHaveAttribute('placeholder', /^(DFN, DCK|DCK, DFN)$/);
  });

  test('fills Client in advanced search from URL clientNumbers', async ({ page }, testInfo) => {
    test.skip(testInfo.project.metadata.userType === 'bceid', 'Only runs for IDIR users');

    await mockApiResponsesWithStub(
      page,
      'forest-clients/byNameAcronymNumber**',
      'forest-clients/byNameAcronymNumber-pg0.json',
    );

    await page.goto('/search?clientNumbers=00049597');
    await page.waitForLoadState('networkidle');

    await page.getByTestId('advanced-search-button-most').click();

    const clientInput = page.getByRole('combobox', { name: 'Client' });
    await expect(clientInput).toHaveValue(/00049597/);
  });

  test('changes district placeholder from default to selected district code', async ({ page }) => {
    const districtInput = page.locator('#district-multi-select-input');
    await expect(districtInput).toHaveAttribute('placeholder', 'District');

    await districtInput.click();
    await page.getByRole('option', { name: 'Fort Nelson' }).click();

    await expect(districtInput).toHaveAttribute('placeholder', 'DFN');
  });

  test('changes district placeholder style to vivid color when selected', async ({ page }) => {
    const districtInput = page.locator('#district-multi-select-input');

    const defaultPlaceholderColor = await districtInput.evaluate((el) => {
      return globalThis.getComputedStyle(el, '::placeholder').color;
    });

    await districtInput.click();
    await page.getByRole('option', { name: 'Fort Nelson' }).click();

    const selectedPlaceholderColor = await districtInput.evaluate((el) => {
      return globalThis.getComputedStyle(el, '::placeholder').color;
    });

    await expect(districtInput).toHaveAttribute('placeholder', 'DFN');
    expect(selectedPlaceholderColor).not.toBe(defaultPlaceholderColor);
  });

  test('updates URL querystring when search values are set', async ({ page }) => {
    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('query-sync-check');
    await searchBox.blur();

    const districtInput = page.locator('#district-multi-select-input');
    await districtInput.click();
    await page.getByRole('option', { name: 'Fort Nelson' }).click();

    await expect(page).toHaveURL(/mainSearchTerm=query-sync-check/);
    await expect(page).toHaveURL(/district=DFN/);
  });
});
