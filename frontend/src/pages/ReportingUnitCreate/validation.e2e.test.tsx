import { expect } from '@playwright/test';

import { setupCreateRuMocks } from './e2e.setup';

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
      const sampling = page.locator('#as-sampling-multi-select');
      await sampling.click();
      await sampling.press('Escape');
      await sampling.blur();

      await expect(
        page.getByText('You must select a sampling option to proceed'),
      ).toBeVisible();
    });
  });

  test.describe('grade field - conditional visibility', () => {
    test('grade radio group is hidden when a non-DKM district is selected', async ({ page }) => {
      const district = page.locator('#create-ru-district');
      await district.click({ force: true });
      await page.getByRole('option', { name: 'Cariboo-Chilcotin' }).click();

      const gradeGroup = page.locator('#create-ru-grade');
      await expect(gradeGroup).not.toBeVisible();
    });

    test('grade radio group becomes visible when DKM district is selected', async ({ page }) => {
      const district = page.locator('#create-ru-district');
      await district.click({ force: true });
      await page.getByRole('option', { name: 'Coast Mountains' }).click();

      const gradeGroup = page.locator('#create-ru-grade');
      await expect(gradeGroup).toBeVisible();
    });

    test('grade radio group shows legend text', async ({ page }) => {
      const district = page.locator('#create-ru-district');
      await district.click({ force: true });
      await page.getByRole('option', { name: 'Coast Mountains' }).click();

      await expect(page.getByText('Select grades you will use')).toBeVisible();
    });

    test('grade shows "Coastal grades" and "Interior grades" options', async ({ page }) => {
      const district = page.locator('#create-ru-district');
      await district.click({ force: true });
      await page.getByRole('option', { name: 'Coast Mountains' }).click();

      await expect(
        page.getByRole('radio', { name: 'Coastal grades' }),
      ).toBeVisible();
      await expect(
        page.getByRole('radio', { name: 'Interior grades' }),
      ).toBeVisible();
    });

    test('grade field is hidden when district is changed from DKM to another', async ({
      page,
    }) => {
      // Select DKM (Coast Mountains)
      const district = page.locator('#create-ru-district');
      await district.click({ force: true });
      await page.getByRole('option', { name: 'Coast Mountains' }).click();

      // Grade group is visible — select a value with force: true to bypass overlay
      await page.getByRole('radio', { name: 'Coastal grades' }).click({ force: true });
      await expect(page.getByRole('radio', { name: 'Coastal grades' })).toBeChecked();

      // Change district to a non-DKM option
      await district.click({ force: true });
      await page.getByRole('option', { name: 'Fort Nelson' }).click();

      // Grade group should no longer be visible
      await expect(page.locator('#create-ru-grade')).not.toBeVisible();
    });
  });
});

