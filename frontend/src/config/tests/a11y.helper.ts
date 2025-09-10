import { checkA11y } from 'axe-playwright';

import type { Page } from '@playwright/test';

export const runA11yAudit = async (page: Page, selector?: string) => {
  await checkA11y(page, selector, {
    detailedReport: true,
    detailedReportOptions: { html: true },
    verbose: true,
    axeOptions: {
      runOnly: ['wcag2a', 'wcag2aa'],
    },
  });
}
