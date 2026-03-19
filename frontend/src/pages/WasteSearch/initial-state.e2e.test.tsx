import { expect } from '@playwright/test';

import { setupWasteSearchMocks } from './e2e.setup';

import { test } from '@/config/tests/coverage.setup';

test.describe('Waste Search - Initial State', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupWasteSearchMocks(page, testInfo.project.metadata.userType, {
      includeSearchRoutes: true,
    });
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
  });

  test('should display page title and subtitle', async ({ page }) => {
    // Verify the page title is visible
    const title = page.getByRole('heading', { name: 'Waste search', level: 1 });
    await expect(title).toBeVisible();

    // Verify the subtitle is present
    const subtitle = page.getByText('Search for reporting units, licensees, or blocks');
    await expect(subtitle).toBeVisible();
  });

  test('should show initial empty state', async ({ page }) => {
    // Verify the empty state message is displayed
    const emptyMessage = page.getByText('Nothing to show yet!');
    await expect(emptyMessage).toBeVisible();

    const emptyDescription = page.getByText(
      'Enter at least one criteria to start the search. The list will display here.',
    );
    await expect(emptyDescription).toBeVisible();
  });

  test('should have search filters section', async ({ page }) => {
    // Verify search filters are present

    // First, check the main filters section
    const filtersSection = page.locator('#main-search');
    await expect(filtersSection).toBeVisible();

    // Then check district filter
    const districtMultiSelect = page.locator('#district-multi-select');
    await expect(districtMultiSelect).toBeVisible();

    // Then check sampling options filter
    const samplingMultiSelect = page.locator('#sampling-multi-select');
    await expect(samplingMultiSelect).toBeVisible();

    // Then check status filter
    const statusMultiSelect = page.locator('#status-multi-select');
    await expect(statusMultiSelect).toBeVisible();

    // Verify search button exists
    const searchButton = page.getByTestId('search-button-most');
    await expect(searchButton).toBeVisible();
  });

  test('should display validation message when searching without criteria', async ({ page }) => {
    // Click search without filling any criteria
    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    // Verify empty state remains
    const emptyMessage = page.getByText('Nothing to show yet!');
    await expect(emptyMessage).toBeVisible();
  });
});
