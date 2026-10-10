import { expect, test } from '@playwright/test';
import { injectAxe } from 'axe-playwright';

import { runA11yAudit } from '@/config/tests/a11y.helper';
import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponses } from '@/config/tests/e2e.helper';

const RU_ID = 34752;
const ROUTE_PATH = `/reporting-units/${RU_ID}`;
const idirMetadata = { userType: 'idir' };

const reportingUnitPayload = {
  id: RU_ID,
  client: { code: '90000001', description: 'Canadian Sample Co.' },
  clientStatus: { code: 'ACT', description: 'Active' },
  grade: { code: 'IN', description: 'Interior' },
  sampling: { code: 'DA', description: 'District Average' },
  district: { code: 'DKM', description: 'Coast Mountains District' },
  createdAt: '2025-05-25',
};

test.describe('<ReportingUnitDetailsPage /> accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await setupAppShellMocks(page, idirMetadata.userType);
    await mockApiResponses(page, `reporting-units/${RU_ID}`, 200, 'application/json', {
      ...reportingUnitPayload,
    });
    await page.route('**/data/params.js', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.config = { VITE_FEATURE_FLAGS: '{"reporting-unit-details-enabled":true,"reporting-unit-block-details-enabled":false}' };`,
      }),
    );
    await mockJwt(page, idirMetadata);
    await page.goto(ROUTE_PATH);
    await page.waitForLoadState('networkidle');
    await injectAxe(page);
  });

  test('has no nested interactive controls', async ({ page }) => {
    await expect(page.getByRole('heading', { name: `Reporting Unit no.: ${RU_ID}` })).toBeVisible();

    const themeToggle = page.getByRole('button', { name: /Switch to .* mode/ });
    await expect(themeToggle).toHaveCount(1);
    await expect(
      themeToggle.locator('button, a, input, select, textarea, [tabindex="0"]'),
    ).toHaveCount(0);

    const clientNumberLink = page.getByRole('link', { name: '90000001' });
    await expect(clientNumberLink).toBeVisible();
    await expect(clientNumberLink).toHaveAttribute('href', /\/clients\/details\/90000001/);
    await expect(clientNumberLink.locator('xpath=ancestor::button')).toHaveCount(0);

    await runA11yAudit(page);

    const initialThemeToggleName = await themeToggle.getAttribute('aria-label');
    await themeToggle.click();
    await expect(themeToggle).not.toHaveAttribute('aria-label', initialThemeToggleName ?? '');
    await expect(page.getByRole('button', { name: /Switch to .* mode/ })).toHaveCount(1);
    await expect(
      page
        .getByRole('button', { name: /Switch to .* mode/ })
        .locator('button, a, input, select, textarea, [tabindex="0"]'),
    ).toHaveCount(0);
    await runA11yAudit(page);
  });
});
