/* eslint-disable @typescript-eslint/no-explicit-any */
import path from 'path';

import { type Page } from '@playwright/test';

// Default stub files location (WireMock compatible)
const STUBS_DIR = 'stubs/__files';

export const mockApi = async (
  page: Page,
  routePath: string,
  route: (route: any) => Promise<void>,
): Promise<void> => {
  await page.route(`**/api/${routePath}`, route);
};

/**
 * Mock API responses with inline content
 */
export const mockApiResponses = async (
  page: Page,
  routePath: string,
  status: number = 200,
  contentType: string = 'application/json',
  content: Record<string, any> = {},
): Promise<void> => {
  await mockApi(page, routePath, async (route) => {
    await route.fulfill(buildResponseBody(status, contentType, content));
  });
};

/**
 * Mock API responses using Playwright's built-in file loading (WireMock compatible)
 * This is the preferred method as Playwright handles the file loading
 * @param page - Playwright page object
 * @param routePath - API route path (e.g., 'v1/reporting-units/search')
 * @param stubFileName - Stub filename in stubs/__files (e.g., 'search-results.json')
 * @param status - HTTP status code (default: 200)
 */
export const mockApiResponsesWithStub = async (
  page: Page,
  routePath: string,
  stubFileName: string,
  status: number = 200,
  contentType: string = 'application/json',
): Promise<void> => {
  await mockApi(page, routePath, async (route) => {
    // Let Playwright handle the file loading directly from stubs/__files
    const stubPath = path.resolve(process.cwd(), STUBS_DIR, stubFileName);

    await route.fulfill({
      status,
      contentType,
      path: stubPath,
    });
  });
};

const buildResponseBody = (
  status: number = 200,
  contentType: string = 'application/json',
  content: Record<string, any> = {},
) =>
  ({
    status,
    contentType,
    body: JSON.stringify(content),
  }) as any;
