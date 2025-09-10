import { test, type Page } from '@playwright/test';
import { checkA11y, injectAxe } from 'axe-playwright';

import { runA11yAudit } from '@/config/tests/a11y.helper';

test.describe('<LangingPage />', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await page.goto('/');
    await injectAxe(page);
  });

  test('simple accessibility run', async () => {
    await checkA11y(page);
  });

  test('check a11y for the whole page and axe run options', async () => {
    await runA11yAudit(page, undefined);
  });

  test.afterAll(async () => {
    await page.close();
  });
});
