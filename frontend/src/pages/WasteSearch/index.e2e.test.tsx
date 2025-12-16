import { test, expect } from '@playwright/test';

import { mockApi, mockApiResponses, mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Waste Search Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await mockApiResponsesWithStub(
      page,
      'users/preferences',
      `users/preferences-GET-${testInfo.project.metadata.userType}.json`,
    );

    if (testInfo.project.metadata.userType === 'bceid') {
      await mockApiResponsesWithStub(
        page,
        'forest-clients/searchByNumbers**',
        'forest-clients/searchByNumbers-pg0.json',
      );
      await mockApiResponsesWithStub(
        page,
        'forest-clients/clients**',
        'forest-clients/clients-pg0.json',
      );
    }

    await mockApiResponsesWithStub(page, 'codes/districts', 'codes/districts.json');

    await mockApiResponsesWithStub(page, 'codes/samplings', 'codes/samplings.json');

    await mockApiResponsesWithStub(
      page,
      'codes/assess-area-statuses',
      'codes/assess-area-statuses.json',
    );

    // Successful searches
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=12345&size=10',
      'search/reporting-units-with-district.json',
    );

    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=67890&size=10',
      'search/reporting-units-pg0.json',
    );

    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=67890&page=1&size=10',
      'search/reporting-units-pg1.json',
    );

    await mockApiResponses(
      page,
      'search/reporting-units?mainSearchTerm=NONEXISTENT&size=10',
      200,
      'application/json',
      {
        content: [],
        page: {
          number: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
        },
      },
    );

    // Failed searches
    await mockApi(page, 'search/reporting-units?mainSearchTerm=outoftime&size=10', (route) =>
      route.abort('connectionrefused'),
    );

    await mockApiResponses(
      page,
      'search/reporting-units?mainSearchTerm=fivehundred&size=10',
      500,
      'application/problem+json',
      {
        detail:
          'Our droids have encountered an internal error while trying to process your request.',
        instance: '/api/search/reporting-units',
        status: 500,
        title: 'Internal Server Error',
      },
    );

    await page.goto('/search');
    await page.waitForLoadState('networkidle');
  });

  test.describe('no search or params yet', () => {
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

  test.describe('filter bar selection', () => {
    test('should be able to see and select one district', async ({ page }) => {
      const districtMultiSelect = page.getByRole('combobox', { name: 'District' });
      await districtMultiSelect.click();

      const option = page.getByRole('option', { name: 'Cariboo-Chilcotin' });
      await option.click();

      const districtFilterTag = page.getByTestId('dt-district-DCC');
      await expect(districtFilterTag).toBeVisible();
    });

    test('should clear search filters', async ({ page }) => {
      // Find the district multi select and select two options
      const districtMultiSelect = page.getByRole('combobox', { name: 'District' });
      await districtMultiSelect.click();

      // Select two districts
      await page.getByRole('option', { name: 'Cariboo-Chilcotin' }).click();
      await page.getByRole('option', { name: 'Chilliwack' }).click();

      // Verify both tags appear
      await expect(page.getByTestId('dt-district-DCC')).toBeVisible();
      const districtFilterTag2 = page.getByTestId('dt-district-DCK');
      await expect(districtFilterTag2).toBeVisible();

      // Dismiss DCK tag
      const districtFilterDismissTag2 = districtFilterTag2.getByRole('button', { name: 'Dismiss' });
      await districtFilterDismissTag2.click();

      // Verify only DCC tag remains
      await expect(page.getByTestId('dt-district-DCC')).toBeVisible();
      await expect(page.getByTestId('dt-district-DCK')).toHaveCount(0);

      // Now click clear all filters
      const clearAllButton = page.getByRole('button', { name: 'Clear filters' });
      await clearAllButton.click();

      // Verify no tags remain
      await expect(page.getByTestId('dt-district-DCC')).toHaveCount(0);
      await expect(page.getByTestId('dt-district-DCK')).toHaveCount(0);
    });
  });

  test.describe('search executed correctly', () => {
    test('should display search results in table', async ({ page }) => {
      const searchBox = page.getByRole('searchbox');
      await searchBox.fill('12345');
      await searchBox.blur();

      const searchButton = page.getByTestId('search-button-most');
      await searchButton.click();

      await page.waitForLoadState('networkidle');

      // Verify mocked data appears
      await expect(page.getByText('90000001')).toBeVisible();
      await expect(page.getByRole('cell', { name: 'CANADIAN SAMPLE CO.' })).toBeVisible();
    });

    test('should allow pagination of results', async ({ page }) => {
      const searchBox = page.getByRole('searchbox');
      await searchBox.fill('67890');
      await searchBox.blur();

      const searchButton = page.getByTestId('search-button-most');
      await searchButton.click();

      await page.waitForLoadState('networkidle');

      // Verify mocked data appears
      await expect(page.getByRole('link', { name: '91234567' }).first()).toBeVisible();
      await expect(page.getByRole('cell', { name: 'NORTHERN TIMBER CO' }).first()).toBeVisible();

      const resultSize = page.getByText('-10 of 12 items');
      await expect(resultSize).toBeVisible();

      // Check pagination controls are visible
      const pagination = page.locator(
        '.cds--popover-container.cds--popover--caret.cds--popover--high-contrast.cds--popover--top-end > .cds--tooltip-trigger__wrapper',
      );
      await expect(pagination).toBeVisible();
      await pagination.click();

      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('link', { name: '92345678' }).first()).toBeVisible();
      await expect(page.getByRole('cell', { name: 'PACIFIC LOGGING LTD' }).first()).toBeVisible();
    });

    test('should display no results message', async ({ page }) => {
      const searchBox = page.getByRole('searchbox');
      await searchBox.fill('NONEXISTENT');
      await searchBox.blur();

      const searchButton = page.getByTestId('search-button-most');
      await searchButton.click();

      await page.waitForLoadState('networkidle');

      await expect(page.getByText('No results')).toBeVisible();
    });
  });

  test.describe('API errors', () => {
    test('API is unavailable', async ({ page }) => {
      const searchBox = page.getByRole('searchbox');
      await searchBox.fill('fivehundred');
      await searchBox.blur();

      const searchButton = page.getByTestId('search-button-most');
      await searchButton.click();

      await page.waitForLoadState('networkidle');

      const errorNotification = page.locator('[role="alert"]');
      await expect(errorNotification).toBeVisible();
      await expect(
        page.getByText(
          'Our droids have encountered an internal error while trying to process your request.',
        ),
      ).toBeVisible();
    });

    test('API timeout', async ({ page }) => {
      const searchBox = page.getByRole('searchbox');
      await searchBox.fill('outoftime');
      await searchBox.blur();

      const searchButton = page.getByTestId('search-button-most');
      await searchButton.click();

      await page.waitForLoadState('networkidle');

      const errorNotification = page.locator('[role="alert"]');
      await expect(errorNotification).toBeVisible();
    });
  });
});
