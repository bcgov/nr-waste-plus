import { expect } from '@playwright/test';

import { setupWasteSearchMocks } from './e2e.setup';

import { test } from '@/config/tests/coverage.setup';

test.describe('Waste Search - Filters', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupWasteSearchMocks(page, testInfo.project.metadata.userType, {
      includeSearchRoutes: true,
    });
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
  });

  test('should be able to see and select one district', async ({ page }) => {
    const districtMultiSelect = page.getByRole('combobox', { name: 'District' });
    await districtMultiSelect.click();

    const option = page.getByRole('option', { name: 'Fort Nelson' });
    await option.click();

    const districtFilterTag = page.getByTestId('dt-district-DFN');
    await expect(districtFilterTag).toBeVisible();
  });

  test('should clear search filters', async ({ page }) => {
    // Find the district multi select and select two options
    const districtMultiSelect = page.getByRole('combobox', { name: 'District' });
    await districtMultiSelect.click();

    // Select two districts
    await page.getByRole('option', { name: 'Fort Nelson' }).click();
    await page.getByRole('option', { name: 'Chilliwack' }).click();

    // Verify both tags appear
    await expect(page.getByTestId('dt-district-DFN')).toBeVisible();
    const districtFilterTag2 = page.getByTestId('dt-district-DCK');
    await expect(districtFilterTag2).toBeVisible();

    // Dismiss DCK tag
    const districtFilterDismissTag2 = districtFilterTag2.getByRole('button', { name: 'Dismiss' });
    await districtFilterDismissTag2.click();

    // Verify only DFN tag remains
    await expect(page.getByTestId('dt-district-DFN')).toBeVisible();
    await expect(page.getByTestId('dt-district-DCK')).toHaveCount(0);

    // Now click clear all filters
    const clearAllButton = page.getByRole('button', { name: 'Clear filters' });
    await clearAllButton.click();

    // Verify no tags remain
    await expect(page.getByTestId('dt-district-DFN')).toHaveCount(0);
    await expect(page.getByTestId('dt-district-DCK')).toHaveCount(0);
  });
});
