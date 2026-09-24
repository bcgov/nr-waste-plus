import { test, expect } from '@playwright/test';

import type {
  FormulaSetResponse,
  FormulaVariablesResponse,
} from '@/services/formulaConfiguration.types';

import { setupAppShellMocks } from '@/config/tests/app.setup';
import { mockJwt } from '@/config/tests/auth.helper';
import { mockApiResponses } from '@/config/tests/e2e.helper';

const canOverrideClaims = (): boolean => process.env.VITE_MOCK_AUTH?.toLowerCase() === 'true';

const variablesResponse: FormulaVariablesResponse = {
  effectiveDate: '2026-09-25',
  area: 'INTERIOR',
  namespaces: {},
  flat: { 'da.mature.merchantableVolume': 100 },
  schema: {},
  catalog: [
    {
      prefix: 'da',
      label: 'District average',
      description: 'District average variables',
      availability: 'RUNTIME',
      variables: [
        { path: 'da.mature.merchantableVolume', label: 'Merchantable volume', value: 100 },
      ],
    },
  ],
};

const currentSetResponse: FormulaSetResponse = {
  id: 9,
  area: 'INTERIOR',
  startDate: '2026-01-01',
  endDate: null,
  deleted: false,
  formulas: [],
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const createdSetResponse: FormulaSetResponse = {
  id: 10,
  area: 'INTERIOR',
  startDate: '2027-01-01',
  endDate: null,
  deleted: false,
  formulas: [],
  createdAt: '2026-09-25T10:00:00Z',
  updatedAt: '2026-09-25T10:00:00Z',
};

const problem422 = {
  type: 'https://example.com/problem/validation-failed',
  title: 'Validation Failed',
  status: 422,
  detail: 'One or more formulas failed validation',
  instance: '/api/configuration/formulas',
  validationErrors: [
    {
      formulaKey: 'da.mature.avoidableGradeY',
      errors: [
        {
          code: 'UNKNOWN_VARIABLE',
          message: 'Unknown variable: da.mature.avoidableGradeY',
          startOffset: 0,
          endOffset: 24,
        },
      ],
    },
  ],
};

test.describe('Formula Configuration Create Page', () => {
  test.beforeEach(async ({ page }, testInfo) => {
    await setupAppShellMocks(page, testInfo.project.metadata.userType);
  });

  test.describe('admin role (IDIR)', () => {
    test('should open the variable catalog, review, and create the set @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await mockApiResponses(
        page,
        'configuration/formulas/variables**',
        200,
        'application/json',
        variablesResponse,
      );
      await mockApiResponses(
        page,
        'configuration/formulas/current/INTERIOR',
        200,
        'application/json',
        currentSetResponse,
      );
      await mockApiResponses(
        page,
        'configuration/formulas',
        201,
        'application/json',
        createdSetResponse,
      );
      await mockApiResponses(
        page,
        'configuration/formulas/10',
        200,
        'application/json',
        createdSetResponse,
      );

      const variablesRequestPromise = page.waitForRequest((request) =>
        request.url().includes('/api/configuration/formulas/variables'),
      );

      await page.goto('/configuration/formulas/new');
      await page.waitForLoadState('domcontentloaded');

      await expect(page.getByRole('heading', { name: 'Create new formula set' })).toBeVisible();

      // FR: the variables query pins the district override code
      const variablesRequest = await variablesRequestPromise;
      expect(variablesRequest.url()).toContain('districtCode=DKM');
      expect(variablesRequest.url()).toContain('area=INTERIOR');

      // Catalog trigger opens the variable catalog modal
      await page.getByRole('button', { name: 'View formula variables' }).click();
      const catalogModal = page.getByTestId('formula-variable-catalog-modal');
      await expect(catalogModal).toBeVisible();
      await expect(catalogModal.getByRole('heading', { name: 'Formula variables' })).toBeVisible();
      await catalogModal.getByRole('button', { name: 'Close' }).click();
      await expect(catalogModal).toBeHidden();

      // First submit switches to review mode (read-only formulas)
      await page.getByRole('button', { name: 'Review formulas' }).click();
      await expect(page.getByRole('button', { name: 'Create formula set' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Back to edit' })).toBeVisible();

      const postRequestPromise = page.waitForRequest(
        (request) =>
          request.method() === 'POST' && request.url().endsWith('/api/configuration/formulas'),
      );

      // Second submit POSTs the set and navigates to the created detail page
      await page.getByRole('button', { name: 'Create formula set' }).click();

      const postRequest = await postRequestPromise;
      const requestBody = postRequest.postDataJSON();
      expect(requestBody.area).toBe('INTERIOR');
      expect(requestBody.endDate).toBeNull();

      await expect(page).toHaveURL(/\/configuration\/formulas\/10/);
      await expect(page.getByRole('heading', { name: 'Formula set: Interior' })).toBeVisible();
    });

    test('should surface a validation alert and stay on the page when the API rejects with 422 @idir-only', async ({
      page,
    }, testInfo) => {
      test.skip(!canOverrideClaims(), 'Per-test role override requires VITE_MOCK_AUTH=true.');

      await mockJwt(page, testInfo.project.metadata, {
        'custom:idp_name': 'idir',
        'cognito:groups': ['WASTE_PLUS_ADMIN'],
      });

      await mockApiResponses(
        page,
        'configuration/formulas/variables**',
        200,
        'application/json',
        variablesResponse,
      );
      await mockApiResponses(
        page,
        'configuration/formulas/current/INTERIOR',
        200,
        'application/json',
        currentSetResponse,
      );
      await mockApiResponses(
        page,
        'configuration/formulas',
        422,
        'application/problem+json',
        problem422,
      );

      await page.goto('/configuration/formulas/new');
      await page.waitForLoadState('domcontentloaded');

      // Review, then attempt to create — the API rejects with 422
      await page.getByRole('button', { name: 'Review formulas' }).click();
      await page.getByRole('button', { name: 'Create formula set' }).click();

      const alert = page.locator('p.formula-config-create-validation');
      await expect(alert).toBeVisible();
      await expect(alert).toContainText('422');
      await expect(alert).toContainText('UNKNOWN_VARIABLE');
      await expect(page).toHaveURL(/\/configuration\/formulas\/new/);
    });
  });
});
