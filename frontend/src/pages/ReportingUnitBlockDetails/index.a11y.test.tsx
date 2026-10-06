import { expect, test } from '@playwright/test';
import { checkA11y, injectAxe } from 'axe-playwright';

import { runA11yAudit } from '@/config/tests/a11y.helper';
import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponses } from '@/config/tests/e2e.helper';

// ── Constants ─────────────────────────────────────────────────────────────────

const RU_ID = 468;
const BLOCK_ID = 12;
const ROUTE_PATH = `/reporting-units/${RU_ID}/${BLOCK_ID}`;

/** Reporting-unit payload used by the a11y audit. */
const reportingUnitPayload = {
  id: RU_ID,
  client: { code: '00002022', description: 'Canadian Forest Products Ltd.' },
  clientStatus: { code: 'ACT', description: 'Active' },
  grade: { code: 'IN', description: 'Interior' },
  sampling: { code: 'DA', description: 'District Average' },
  district: { code: 'DKM', description: 'Coast Mountains District' },
  createdAt: '2025-05-25',
};

test.describe('<ReportingUnitBlockDetailsPage />', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
    // The a11y project authenticates as BCeID, but the block details route now
    // requires the ADMIN role — grant it for the audit run.
    await mockJwt(
      page,
      { ...testInfo.project.metadata, userType: 'idir' },
      { 'cognito:groups': ['WASTE_PLUS_ADMIN'] },
    );
    await mockApiResponses(page, `reporting-units/${RU_ID}`, 200, 'application/json', {
      ...reportingUnitPayload,
    });
    // The a11y workflow keeps the block details flag off (matching the other
    // reporting-unit flags there), so inject it at runtime: params.js loads
    // with `defer` before the main bundle, so window.config is set before
    // env.ts evaluates featureFlags on page load.
    await page.route('**/data/params.js', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `window.config = { VITE_FEATURE_FLAGS: '{"reporting-unit-block-details-enabled":true}' };`,
      }),
    );
    await page.goto(ROUTE_PATH);
    await page.waitForLoadState('domcontentloaded');
    await injectAxe(page);
  });

  test('simple accessibility run', async ({ page }) => {
    // Assert the audited page is the block details page, not a redirect target.
    const heading = page.locator('h1', { hasText: `Reporting Unit No. ${RU_ID}` });
    await expect(heading).toBeVisible();
    await checkA11y(page);
  });

  test('check a11y for the whole page and axe run options', async ({ page }) => {
    // Assert the audited page is the block details page, not a redirect target.
    const heading = page.locator('h1', { hasText: `Reporting Unit No. ${RU_ID}` });
    await expect(heading).toBeVisible();
    await runA11yAudit(page, undefined);
  });
});
