import type { Page } from '@playwright/test';

import { mockApi, mockApiResponsesWithStub } from '@/config/tests/e2e.helper';

/**
 * Sets up the common API mocks shared by the ReportingUnitCreate e2e tests.
 *
 * Mocks:
 * - users/preferences
 * - codes/districts
 * - codes/samplings
 * - forest-clients (bceid or idir variant)
 *
 * Does NOT mock the POST /api/reporting-units endpoint — callers add that
 * themselves so each test file can configure the desired outcome.
 *
 * @param page      Playwright page.
 * @param userType  Value from `testInfo.project.metadata.userType` ('bceid' | 'idir').
 */
export const setupCreateRuMocks = async (page: Page, userType: string): Promise<void> => {
  await mockApiResponsesWithStub(page, 'users/preferences', 'users/preferences-GET.json');
  await mockApiResponsesWithStub(page, 'codes/districts', 'codes/districts.json');
  await mockApiResponsesWithStub(page, 'codes/samplings', 'codes/samplings.json');
  await mockApiResponsesWithStub(
    page,
    'codes/assess-area-statuses',
    'codes/assess-area-statuses.json',
  );

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
  } else {
    // IDIR uses autocomplete search
    await mockApiResponsesWithStub(
      page,
      'forest-clients/byNameAcronymNumber**',
      'forest-clients/byNameAcronymNumber-pg0.json',
    );
  }
};

/**
 * Adds a mock for the POST /api/reporting-units endpoint that returns 201 with
 * a Location header pointing to the default new reporting unit ID (99901).
 *
 * Also mocks the subsequent GET for that reporting unit so the details page
 * loads without errors after successful navigation.
 *
 * @param page Playwright page.
 */
export const mockCreateRuSuccess = async (page: Page): Promise<void> => {
  await mockApi(page, 'reporting-units', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 201,
        // The app calls http://localhost:8080 (cross-origin from localhost:3000).
        // Browsers only expose CORS-safelisted headers to XHR by default.
        // Location is not safelisted, so it must be explicitly exposed.
        headers: {
          'Location': '/reporting-units/99901',
          'Access-Control-Expose-Headers': 'location',
        },
      });
    } else {
      await route.continue();
    }
  });

  // Mock the details page GET that the router navigates to after success
  await mockApiResponsesWithStub(
    page,
    'reporting-units/99901',
    'reporting-units/details-default.json',
  );
};

/**
 * Adds a mock for the POST /api/reporting-units endpoint that returns 500
 * (simulates a server error such as a missing forest client record).
 *
 * @param page Playwright page.
 */
export const mockCreateRuServerError = async (page: Page): Promise<void> => {
  await mockApi(page, 'reporting-units', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Forest Client record(s) with id ERROR_TEST not found!',
        }),
      });
    } else {
      await route.continue();
    }
  });
};

/**
 * Adds a mock for the POST /api/reporting-units endpoint that returns 409
 * (simulates a duplicate conflict: a reporting unit for this client+district
 * combination already exists).
 *
 * @param page Playwright page.
 */
export const mockCreateRuConflict = async (page: Page): Promise<void> => {
  await mockApi(page, 'reporting-units', async (route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 409,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'A reporting unit for client CONFLICT_TEST and district ABC already exists!',
        }),
      });
    } else {
      await route.continue();
    }
  });
};
