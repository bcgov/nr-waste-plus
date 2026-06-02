import { expect } from '@playwright/test';

import { setupCreateRuMocks } from './e2e.setup';
import { selectComboBoxOption } from './e2e.utils';

import { test } from '@/config/tests/coverage.setup';

test.describe('Create Reporting Unit - Validation', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupCreateRuMocks(page, testInfo.project.metadata.userType);
    await page.goto('/reporting-units/create');
    await page.waitForLoadState('networkidle');
  });

  test.describe('district field validation', () => {
    test('shows error when district is not selected on blur', async ({ page }) => {
      const district = page.locator('#create-ru-district');
      await district.click();
      await district.press('Escape');
      await district.blur();

      await expect(page.getByText('You must select a district to proceed')).toBeVisible();
    });
  });

  test.describe('sampling option field validation', () => {
    test('shows error when sampling is not selected on blur', async ({ page }) => {
      // AVG is pre-selected by default — clear it to trigger the required validator
      await page.getByRole('button', { name: 'Clear selected item' }).click();
      await page.locator('#as-sampling-multi-select').blur();

      await expect(page.getByText('You must select a sampling option to proceed')).toBeVisible();
    });
  });

  test.describe('grade field - conditional visibility', () => {
    test('grade radio group is hidden when a non-DKM district is selected', async ({ page }) => {
      await selectComboBoxOption(page, 'District', 'Cariboo-Chilcotin');

      const gradeGroup = page.locator('#create-ru-grade');
      await expect(gradeGroup).not.toBeVisible();
    });

    test('grade radio group becomes visible when DKM district is selected', async ({ page }) => {
      await selectComboBoxOption(page, 'District', 'Coast Mountains');

      const gradeGroup = page.locator('#create-ru-grade');
      await expect(gradeGroup).toBeVisible();
    });

    test('grade radio group shows legend text', async ({ page }) => {
      await selectComboBoxOption(page, 'District', 'Coast Mountains');

      await expect(page.getByText('Select grades you will use')).toBeVisible();
    });

    test('grade shows "Coastal grades" and "Interior grades" options', async ({ page }) => {
      await selectComboBoxOption(page, 'District', 'Coast Mountains');

      await expect(page.getByRole('radio', { name: 'Coastal grades' })).toBeVisible();
      await expect(page.getByRole('radio', { name: 'Interior grades' })).toBeVisible();
    });

    test('grade field is hidden when district is changed from DKM to another', async ({ page }) => {
      // Select DKM (Coast Mountains)
      await selectComboBoxOption(page, 'District', 'Coast Mountains');

      // Grade group is visible — select a value with force: true to bypass overlay
      await page.getByRole('radio', { name: 'Coastal grades' }).click({ force: true });
      await expect(page.getByRole('radio', { name: 'Coastal grades' })).toBeChecked();

      // Change district to a non-DKM option
      await selectComboBoxOption(page, 'District', 'Fort Nelson');

      // Grade group should no longer be visible
      await expect(page.locator('#create-ru-grade')).not.toBeVisible();
    });
  });
});
