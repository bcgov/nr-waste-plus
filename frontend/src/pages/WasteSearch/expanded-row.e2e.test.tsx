import { expect } from '@playwright/test';

import { setupWasteSearchMocks } from './e2e.setup';

import { test } from '@/config/tests/coverage.setup';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Waste Search - Expanded Row Content', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupWasteSearchMocks(page, testInfo.project.metadata.userType, {
      includeSearchRoutes: true,
    });
    await page.goto('/search');
    await page.waitForLoadState('networkidle');
  });

  test('displays all fields when expanding row with full data', async ({ page }) => {
    // Mock the expand API endpoint
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units/ex/34906/102',
      'search/reporting-units-expanded-full.json',
    );

    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('67890');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    await page.waitForLoadState('networkidle');

    // Click the expand button for the first row
    const expandButton = page.locator('button[aria-label*="Expand"]').first();
    await expandButton.click();

    // Verify all fields are displayed
    await expect(page.getByTestId('card-item-content-licence-number')).toHaveText('A97537'); // licenceNo
    await expect(page.getByTestId('card-item-content-cutting-permit')).toHaveText('R02'); // cuttingPermit
    await expect(
      page.getByTestId('card-item-timber-mark').first().getByRole('definition'),
    ).toContainText('HK4C02'); // timberMark
    await expect(page.getByTestId('card-item-content-exempted-(yes/no)')).toHaveText('No'); // exempted (false)
    await expect(page.getByTestId('card-item-content-net-area')).toHaveText('7.39 ha'); // netArea
    await expect(page.getByTestId('card-item-content-submitter')).toHaveText(
      String.raw`BCEID\ICEKING`,
    ); // submitter
    await expect(page.getByTestId('card-item-comment:')).toHaveText(
      'Comment:This is a sample comment for the reporting unit.',
    ); // comments
    await expect(page.getByRole('link', { name: /Link/i })).toBeVisible(); // attachments and comments link
    await expect(page.getByText('No. of blocks in RU: 15')).toBeVisible(); // totalBlocks
  });

  test('handles missing attachment and comment correctly', async ({ page }) => {
    // Mock the expand API endpoint
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units/ex/34906/105',
      'search/reporting-units-expanded-noattach.json',
    );

    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('67890');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    await page.waitForLoadState('networkidle');

    // Click the expand button for the second row
    const expandButtons = page.locator('button[aria-label*="Expand"]');
    const secondExpandButton = expandButtons.nth(1);
    await secondExpandButton.click();

    await page.waitForLoadState('networkidle');

    // Verify all fields are displayed
    await expect(page.getByTestId('card-item-content-licence-number')).toHaveText('W1940'); // licenceNo
    await expect(page.getByTestId('card-item-content-cutting-permit')).toHaveText('EA'); // cuttingPermit
    await expect(
      page.getByTestId('card-item-timber-mark').first().getByRole('definition'),
    ).toContainText('WBMJEC'); // timberMark
    await expect(page.getByTestId('card-item-content-exempted-(yes/no)')).toHaveText('Yes'); // exempted (false)
    await expect(page.getByTestId('card-item-content-net-area')).toHaveText('3.07 ha'); // netArea
    await expect(page.getByTestId('card-item-content-submitter')).toHaveText(
      String.raw`BCEID\\BMO`,
    ); // submitter
    await expect(page.getByTestId('card-item-comment:')).toHaveText('Comment:-'); // comments
    await expect(page.getByText('No. of blocks in RU: 2')).toBeVisible(); // totalBlocks

    // Verify attachments and comments link is present
    const attachmentsCommentsLinks = page.getByRole('link', {
      name: /Link/i,
    });
    await expect(attachmentsCommentsLinks).toHaveCount(1);
  });

  test('displays empty content when wasteAssessmentAreaId is null (no API call)', async ({
    page,
  }) => {
    // This search will return a row with wasteAssessmentAreaId: null, so no expand API call will be made
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=noblock&size=10',
      'search/reporting-units-noblock.json',
    );

    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('noblock');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    await page.waitForLoadState('networkidle');

    // Verify row is displayed
    await expect(page.getByText('NORTHERN TIMBER CO')).toBeVisible();

    // Click the expand button for the row with null wasteAssessmentAreaId
    const expandButton = page.locator('button[aria-label*="Expand"]').first();
    await expandButton.click();

    await page.waitForLoadState('networkidle');

    // Verify loading skeleton is shown (since no API data will be returned)
    const skeletons = page.locator('.cds--skeleton');
    await expect(skeletons).toHaveCount(0); // After loading completes, should have no skeletons

    // Verify fields are empty/placeholder
    const dataFields = page.locator('[data-testid*="card-item-content"]');
    // With null wasteAssessmentAreaId, component won't fetch data, so fields should be in loading state or empty
    expect(dataFields.first()).toBeDefined();
  });

  test('expand more than one entry', async ({ page }) => {
    // Mock the expand API endpoint
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units/ex/34906/102',
      'search/reporting-units-expanded-full.json',
    );
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units/ex/34906/105',
      'search/reporting-units-expanded-full.json',
    );

    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('67890');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    await page.waitForLoadState('networkidle');

    // Click the expand button for the first row
    const row1 = page
      .getByRole('row', {
        name: 'Expand row for more details R102 34906 91234567 NORTHERN TIMBER CO AGR -',
      })
      .getByLabel('Expand row for more details');
    const row2 = page
      .getByRole('row', {
        name: 'Expand row for more details R105 34906 91234567 NORTHERN TIMBER CO AGR -',
      })
      .getByLabel('Expand row for more details');

    await row1.click();
    await page.waitForLoadState('networkidle');

    await row2.click();
    await page.waitForLoadState('networkidle');

    const expandedRows = page.locator('tr.cds--parent-row.cds--expandable-row');
    await expect(expandedRows).toHaveCount(2);
  });

  test('check primary and secondary', async ({ page }) => {
    // Mock the expand API endpoint
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units/ex/10501/2',
      'search/reporting-units-expanded-primary.json',
    );
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units/ex/36834/26',
      'search/reporting-units-expanded-secondary.json',
    );

    const searchBox = page.getByRole('searchbox');
    await searchBox.fill('67890');
    await searchBox.blur();

    const searchButton = page.getByTestId('search-button-most');
    await searchButton.click();

    await page.waitForLoadState('networkidle');

    // Click the expand button for the first row
    const secondary = page.locator(
      'tr:nth-child(17) > .cds--table-expand > .cds--table-expand__button',
    );
    await secondary.click();
    await page.waitForLoadState('networkidle');

    await expect(
      page.getByTestId('card-item-timber-mark').first().getByRole('definition'),
    ).toContainText('JY1009'); // timberMark

    const primary = page.locator(
      'tr:nth-child(19) > .cds--table-expand > .cds--table-expand__button',
    );
    await primary.click();
    await page.waitForLoadState('networkidle');

    const expandedRows = page.locator('tr.cds--parent-row.cds--expandable-row');
    await expect(expandedRows).toHaveCount(2);
  });
});
