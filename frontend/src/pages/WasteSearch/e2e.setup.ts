import type { Page } from '@playwright/test';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockApi, mockApiResponses, mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

/**
 * Sets up the common API mocks shared by the Waste Search e2e tests.
 *
 * Call this in `test.beforeEach` before navigating to the page.
 */
export const setupWasteSearchMocks = async (
  page: Page,
  userType: string,
  options: { includeSearchRoutes?: boolean } = {},
) => {
  const { includeSearchRoutes = false } = options;

  await setupAppShellMocks(page, userType);

  if (includeSearchRoutes) {
    // Successful searches
    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=12345&size=10',
      'search/reporting-units-with-district.json',
    );

    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=67890&size=10',
      'search/reporting-units-pg0.json',
    );

    await mockApiResponsesWithStub(
      page,
      'search/reporting-units?mainSearchTerm=67890&page=1&size=10',
      'search/reporting-units-pg1.json',
    );

    await mockApiResponses(
      page,
      'search/reporting-units?mainSearchTerm=NONEXISTENT&size=10',
      200,
      'application/json',
      {
        content: [],
        page: {
          number: 0,
          size: 10,
          totalElements: 0,
          totalPages: 0,
        },
      },
    );

    // Failed searches
    await mockApi(page, 'search/reporting-units?mainSearchTerm=outoftime&size=10', (route) =>
      route.abort('connectionrefused'),
    );

    await mockApiResponses(
      page,
      'search/reporting-units?mainSearchTerm=fivehundred&size=10',
      500,
      'application/problem+json',
      {
        detail:
          'Our droids have encountered an internal error while trying to process your request.',
        instance: '/api/search/reporting-units',
        status: 500,
        title: 'Internal Server Error',
      },
    );
  }
};
