import { mockApiResponsesWithStub } from './e2e.helper';

import type { Page } from '@playwright/test';

/**
 * Registers the API stubs required by the application shell (header, nav,
 * profile panel) for every page that renders inside the authenticated layout.
 *
 * Call this in `test.beforeEach` before navigating to any page.
 */
export const setupAppShellMocks = async (page: Page, userType: string): Promise<void> => {
  await mockApiResponsesWithStub(page, 'users/preferences', 'users/preferences-GET.json');

  if (userType === 'bceid') {
    await mockApiResponsesWithStub(
      page,
      'forest-clients/searchByNumbers**',
      'forest-clients/searchByNumbers-pg0.json',
    );
    await mockApiResponsesWithStub(
      page,
      'forest-clients/clients**',
      'forest-clients/clients-pg0.json',
    );
  }

  await mockApiResponsesWithStub(page, 'codes/districts', 'codes/districts.json');
  await mockApiResponsesWithStub(page, 'codes/samplings', 'codes/samplings.json');
  await mockApiResponsesWithStub(
    page,
    'codes/assess-area-statuses',
    'codes/assess-area-statuses.json',
  );
};
