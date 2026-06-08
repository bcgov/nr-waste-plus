import { expect } from '@playwright/test';

import { test } from '@/config/tests/coverage.setup';
import { mockApi, mockApiResponses, mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Waste Search Bookmarks', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await mockApiResponsesWithStub(page, 'users/preferences', 'users/preferences-GET.json');

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

    await page.goto('/search');
  });

  test('should bookmark a reporting unit and then filter by bookmarked only', async ({ page }) => {
    // Step 1: Search for "12345" — results come back with bookmarked: false
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=12345&size=10',
      'search/reporting-units-with-district.json',
    );

    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('12345');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    // Verify both rows are shown and none are bookmarked
    await expect(page.getByText('CANADIAN SAMPLE CO.')).toBeVisible();
    await expect(page.getByText('JOHN WICK LOGGING LTD.')).toBeVisible();

    // Every bookmark button should say "Bookmark this reporting unit"
    const bookmarkButtons = page.getByRole('button', { name: 'Bookmark this reporting unit' });
    await expect(bookmarkButtons.first()).toBeVisible();

    // Step 2: Bookmark the first row (RU 123)
    // Mock the PUT endpoint to return 202 with empty body
    await mockApi(page, 'users/bookmarks/123', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({ status: 202, body: '' });
      }
    });

    // After bookmarking, the table will refetch — now return results with first row bookmarked
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=12345&size=10',
      'search/reporting-units-bookmarked.json',
    );

    // Click the bookmark button for the first row
    await bookmarkButtons.first().click();

    // Wait for the success notification
    await expect(page.getByText('Added to bookmarks', { exact: true })).toBeVisible();

    // After refetch, the first row should now show "Remove from bookmarked"
    await expect(
      page.getByRole('button', { name: 'Remove from bookmarked' }).first(),
    ).toBeVisible();

    // Step 3: Enable the "Bookmarked RUs only" filter and search
    // Mock the bookmarked-only search to return just the one bookmarked row
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=12345&bookmarked=true&size=10',
      'search/reporting-units-bookmarked-only.json',
    );

    // Open advanced search and check the bookmarked checkbox
    const advancedSearchButton = page.getByTestId('advanced-search-button-most');
    await advancedSearchButton.click();

    const bookmarkedCheckbox = page.locator('label').filter({ hasText: 'Bookmarked RUs only' });
    await bookmarkedCheckbox.click();

    // Close advanced search
    const closeButton = page
      .getByTestId('advanced-search-modal')
      .getByRole('button', { name: 'Search' });
    await closeButton.click();

    // Execute search with the bookmarked filter
    await searchButton.click();

    // Only the bookmarked row should appear
    await expect(page.getByText('CANADIAN SAMPLE CO.')).toBeVisible();
    await expect(page.getByText('JOHN WICK LOGGING LTD.')).not.toBeVisible();

    // Verify the result count
    await expect(page.getByText('1-1 of 1 items')).toBeVisible();
  });

  test('should unbookmark a previously bookmarked reporting unit', async ({ page }) => {
    // Start with a search where the first row is already bookmarked
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=12345&size=10',
      'search/reporting-units-bookmarked.json',
    );

    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('12345');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    // First row should show "Remove from bookmarked"
    const removeButton = page.getByRole('button', { name: 'Remove from bookmarked' });
    await expect(removeButton.first()).toBeVisible();

    // Mock the DELETE endpoint to return 204 with empty body
    await mockApi(page, 'users/bookmarks/123', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({ status: 204, body: '' });
      }
    });

    // After unbookmarking, the table will refetch — return results with no bookmarks
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=12345&size=10',
      'search/reporting-units-with-district.json',
    );

    // Click the remove bookmark button
    await removeButton.first().click();

    // Wait for the success notification
    await expect(page.getByText('Removed from bookmarks', { exact: true })).toBeVisible();

    // After refetch, all rows should show "Bookmark this reporting unit"
    await expect(
      page.getByRole('button', { name: 'Bookmark this reporting unit' }).first(),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Remove from bookmarked' })).not.toBeVisible();
  });

  test('should display error notification when bookmark toggle fails', async ({ page }) => {
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=12345&size=10',
      'search/reporting-units-with-district.json',
    );

    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('12345');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    // Mock the PUT endpoint to return 500
    await mockApiResponses(page, 'users/bookmarks/123', 500, 'application/problem+json', {
      detail: 'Unable to toggle bookmark.',
      instance: '/api/users/bookmarks/123',
      status: 500,
      title: 'Internal Server Error',
    });

    // Click the bookmark button
    const bookmarkButton = page.getByRole('button', { name: 'Bookmark this reporting unit' });
    await bookmarkButton.first().click();

    // Error notification should appear
    await expect(page.getByText('Failed to toggle bookmark', { exact: true })).toBeVisible();
    await expect(page.getByText('Failed to toggle bookmark for Reporting Unit 123')).toBeVisible();
  });
});
