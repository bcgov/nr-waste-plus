import { test, expect } from '@playwright/test';
import { mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

test.describe('Formula Configuration Create - IDIR ADMIN', () => {
  test('IDIR ADMIN can access /configuration/formulas/new', async ({ page }) => {
    await mockApiResponsesWithStub(page, 'codes/districts', 'codes/districts.json');
    await mockApiResponsesWithStub(
      page,
      'configuration/formulas',
      'configuration/formulas/list.json',
    );

    await page.goto('/configuration/formulas/new');
    await page.waitForLoadState('networkidle');

    await expect(page.getByTestId('formula-config-create-form')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review formulas' })).toBeVisible();
  });
});
