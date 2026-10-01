import { expect, test } from '@playwright/test';
import { checkA11y, injectAxe } from 'axe-playwright';

import { runA11yAudit } from '@/config/tests/a11y.helper';
import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponses } from '@/config/tests/e2e.helper';

// ── Constants ─────────────────────────────────────────────────────────────────

const RU_ID = 468;
const BLOCK_ID = 12;
const ROUTE_PATH = `/reporting-units/${RU_ID}/blocks/${BLOCK_ID}`;

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
    await mockJwt(page, testInfo.project.metadata);
    await mockApiResponses(page, `reporting-units/${RU_ID}`, 200, 'application/json', {
      ...reportingUnitPayload,
    });
    await page.goto(ROUTE_PATH);
    await page.waitForLoadState('domcontentloaded');
    await injectAxe(page);
  });

  test('simple accessibility run', async ({ page }) => {
    // Assert the audited page is the block details page, not a redirect target.
    await expect(
      page.getByRole('heading', { level: 1, name: `Reporting Unit No. ${RU_ID}` }),
    ).toBeVisible();
    await checkA11y(page);
  });

  test('check a11y for the whole page and axe run options', async ({ page }) => {
    // Assert the audited page is the block details page, not a redirect target.
    await expect(
      page.getByRole('heading', { level: 1, name: `Reporting Unit No. ${RU_ID}` }),
    ).toBeVisible();
    await runA11yAudit(page, undefined);
  });
});
