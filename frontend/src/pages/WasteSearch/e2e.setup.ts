import type { Page } from '@playwright/test';

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
