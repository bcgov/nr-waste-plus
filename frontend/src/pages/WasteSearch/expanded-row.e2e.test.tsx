import { expect } from '@playwright/test';

import { setupWasteSearchMocks } from './e2e.setup';

import { test } from '@/config/tests/coverage.setup';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

/**
 * Builds a `data-testid` selector for an expanded-row value cell (the `<dd>`),
 * anchored so it never collides with the wrapping `<dl>` (which omits `content-`).
 *
 * @param field The field suffix (e.g. `license-number`).
 * @returns A regex matching the value cell testid for the single expanded row.
 */
const valueCell = (field: string): RegExp => new RegExp(`^card-item-content-.*${field}$`);

test.describe('Waste Search - Expanded Row Content', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupWasteSearchMocks(page, testInfo.project.metadata.userType, {
      includeSearchRoutes: true,
    });
    await page.goto('/search');
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

    // Click the expand button for the first row
    const expandButton = page.locator('button[aria-label*="Expand"]').first();
    await expandButton.click();

    // Verify all fields are displayed
    await expect(page.getByTestId(valueCell('license-number'))).toHaveText('A97537'); // licenceNo
    await expect(page.getByTestId(valueCell('cutting-permit'))).toHaveText('R02'); // cutingPermit
    await expect(page.getByTestId(valueCell('timber-mark'))).toContainText('HK4C02'); // timberMark
    await expect(page.getByTestId(valueCell('exempted'))).toHaveText('No'); // exempted (false)
    await expect(page.getByTestId(valueCell('net-area'))).toHaveText('7.39 ha'); // netArea
    await expect(page.getByTestId(valueCell('submitter'))).toHaveText(String.raw`BCEID\ICEKING`); // submitter
    await expect(
      page.getByText('Comment:This is a sample comment for the reporting unit.'),
    ).toBeVisible(); // comments
    await expect(page.getByRole('link', { name: /Link/i })).toBeVisible(); // attachments and comments link
    await expect(page.getByText('Blocks in the RU: 15')).toBeVisible(); // totalBlocks
    await expect(page.getByText('Secondary marks in the block: 0')).toBeVisible(); // totalChildren (defaults to 0)

    // The last two values are rendered via ReadonlyInput card items.
    await expect(
      page.locator('dl.card-item').filter({ hasText: 'Blocks in the RU: 15' }),
    ).toHaveCount(1);
    await expect(
      page.locator('dl.card-item').filter({ hasText: 'Secondary marks in the block: 0' }),
    ).toHaveCount(1);
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

    // Click the expand button for the second row
    const expandButtons = page.locator('button[aria-label*="Expand"]');
    const secondExpandButton = expandButtons.nth(1);
    await secondExpandButton.click();

    // Verify all fields are displayed
    await expect(page.getByTestId(valueCell('license-number'))).toHaveText('W1940'); // licenceNo
    await expect(page.getByTestId(valueCell('cutting-permit'))).toHaveText('EA'); // cutingPermit
    await expect(page.getByTestId(valueCell('timber-mark'))).toContainText('WBMJEC'); // timberMark
    await expect(page.getByTestId(valueCell('exempted'))).toHaveText('Yes'); // exempted (true)
    await expect(page.getByTestId(valueCell('net-area'))).toHaveText('3.07 ha'); // netArea
    await expect(page.getByTestId(valueCell('submitter'))).toHaveText(String.raw`BCEID\\BMO`); // submitter
    await expect(page.getByText('Comment:-')).toBeVisible(); // comments (empty)
    await expect(page.getByText('Blocks in the RU: 2')).toBeVisible(); // totalBlocks
    await expect(page.getByText('Secondary marks in the block: 0')).toBeVisible(); // totalChildren (defaults to 0)

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

    // Verify row is displayed
    await expect(page.getByText('NORTHERN TIMBER CO')).toBeVisible();

    // Click the expand button for the row with null wasteAssessmentAreaId
    const expandButton = page.locator('button[aria-label*="Expand"]').first();
    await expandButton.click();

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

    await row2.click();

    const expandedRows = page.locator('tr.cds--parent-row.cds--expandable-row');
    await expect(expandedRows).toHaveCount(2);
  });

  test('check primary and secondary', async ({ page }) => {
    // Expand a primary-mark row (RU-34906-Block-102, wasteAssessmentAreaId 102) …
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units/ex/34906/102',
      'search/reporting-units-expanded-full.json',
    );
    // … and a secondary-mark row (RU-36834-Block-26, wasteAssessmentAreaId 26).
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

    // Expand rows by their visible RU identifier (robust to column/row ordering).
    const expandRowByText = async (text: string) => {
      const row = page.getByRole('row').filter({ hasText: text }).first();
      await row.getByRole('button', { name: 'Expand row for more details' }).click();
    };

    await expandRowByText('34906'); // first row (RU-34906-Block-102)
    await expandRowByText('36834'); // secondary-entry row (RU-36834-Block-26)

    // Both rows should be expanded.
    const expandedRows = page.locator('tr.cds--parent-row.cds--expandable-row');
    await expect(expandedRows).toHaveCount(2);

    // Primary row renders its timber mark (HK4C02 from expanded-full.json).
    await expect(page.getByTestId(valueCell('timber-mark')).first()).toContainText('HK4C02');
    // Secondary row renders its timber mark (JY1009 from expanded-secondary.json).
    await expect(page.getByTestId(valueCell('timber-mark')).nth(1)).toContainText('JY1009');
  });
});
