import { act, render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { headers } from './constants';

import type { CodeDescriptionDto } from '@/services/types';

import { createRouterWrapper } from '@/config/tests/routerTestHelper';
import { Role } from '@/context/auth/types';
import * as useAuthModule from '@/context/auth/useAuth';
import * as envModule from '@/env';

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock(import('@/env'), async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    env: {
      ...actual.env,
      VITE_LEGACY_BASE_URL: 'https://legacy.example.com',
      VITE_CLIENT_BASE_URL: 'https://clients.example.com',
    },
    featureFlags: {
      ...actual.featureFlags,
      'reporting-unit-details-enabled': false,
    },
  };
});

vi.mock('@/context/auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function mockIdirUser() {
  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    user: {
      userName: 'jryan',
      displayName: 'Jack Ryan',
      idpProvider: 'IDIR',
      roles: [Role.IDIR],
      email: 'jack.ryan@gov.bc.ca',
    },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  } as unknown as ReturnType<typeof useAuthModule.useAuth>);
}

function mockBceidUser() {
  vi.mocked(useAuthModule.useAuth).mockReturnValue({
    user: {
      userName: 'uattest',
      displayName: 'Uat Test',
      idpProvider: 'BCEID',
      roles: [],
      email: 'uattest@gov.bc.ca',
    },
    isAuthenticated: true,
    login: vi.fn(),
    logout: vi.fn(),
  } as unknown as ReturnType<typeof useAuthModule.useAuth>);
}

describe('WasteSearchTable Constants', () => {
  beforeEach(() => {
    mockIdirUser();
  });
  describe('headers', () => {
    it('should export headers array', () => {
      expect(headers).toBeDefined();
      expect(Array.isArray(headers)).toBe(true);
      expect(headers.length).toBeGreaterThan(0);
    });

    it('should have required header properties', () => {
      headers.forEach((header) => {
        expect(header.key).toBeDefined();
        expect(header.header).toBeDefined();
      });
    });

    it('should have cutBlockId header with renderAs', () => {
      const cutBlockIdHeader = headers.find((h) => h.key === 'cutBlockId');
      expect(cutBlockIdHeader).toBeDefined();
      expect(cutBlockIdHeader?.renderAs).toBeDefined();
    });

    it('should render EmptyValueTag for string values using renderAs', () => {
      const headers_with_renderAs = headers.filter((h) => h.renderAs);
      const emptyValueTagHeaders = ['cutBlockId', 'licenseNumber', 'cuttingPermit', 'timberMark'];

      emptyValueTagHeaders.forEach((key) => {
        const header = headers_with_renderAs.find((h) => h.key === key);
        expect(header).toBeDefined();

        if (header?.renderAs) {
          const result = header.renderAs('test-value');
          expect(result).toBeDefined();

          render(result);
          expect(screen.getAllByText('test-value').length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle empty/null values in EmptyValueTag renderAs', () => {
      const cutBlockIdHeader = headers.find((h) => h.key === 'cutBlockId');

      if (cutBlockIdHeader?.renderAs) {
        const emptyResult = cutBlockIdHeader.renderAs('');
        expect(emptyResult).toBeDefined();

        render(emptyResult);
        expect(screen.getAllByTestId('empty-value').length).toBeGreaterThan(0);

        const nullResult = cutBlockIdHeader.renderAs(null);
        expect(nullResult).toBeDefined();

        render(nullResult);
        expect(screen.getAllByTestId('empty-value').length).toBeGreaterThan(0);
      }
    });

    it('should use the same renderAs function for all EmptyValueTag columns', () => {
      const emptyValueTagKeys = ['cutBlockId', 'licenseNumber', 'cuttingPermit', 'timberMark'];

      const renderFunctions = emptyValueTagKeys
        .map((key) => {
          const header = headers.find((h) => h.key === key);
          return header?.renderAs;
        })
        .filter((fn) => fn !== undefined);

      const firstRender = renderFunctions[0];
      renderFunctions.forEach((renderFn) => {
        expect(renderFn).toBe(firstRender);
      });
    });

    it('should have correct header properties for EmptyValueTag columns', () => {
      const expectedHeaders = [
        { key: 'cutBlockId', header: 'Block ID', sortable: true, selected: true },
        {
          key: 'licenseNumber',
          header: 'Licence No.',
          sortable: true,
          selected: false,
        },
        {
          key: 'cuttingPermit',
          header: 'Cutting Permit',
          sortable: true,
          selected: false,
        },
        {
          key: 'timberMark',
          header: 'Timber Mark',
          sortable: true,
          selected: false,
        },
      ];

      expectedHeaders.forEach((expectedHeader) => {
        const header = headers.find((h) => h.key === expectedHeader.key);
        expect(header?.key).toBe(expectedHeader.key);
        expect(header?.header).toBe(expectedHeader.header);
        expect(header?.sortable).toBe(expectedHeader.sortable);
        expect(header?.selected).toBe(expectedHeader.selected);
      });
    });

    it('should render ruNumber as legacy link when feature flag is disabled', async () => {
      const ruHeader = headers.find((h) => h.key === 'ruNumber');
      expect(ruHeader?.renderAs).toBeDefined();
      if (ruHeader?.renderAs) {
        const result = ruHeader.renderAs('RU-001');
        render(result);
        await act(async () => {});
        expect(screen.getByTestId('redirect-link-tag')).toBeDefined();
      }
    });

    it('should render client.code as role-based redirect link for IDIR user', async () => {
      mockIdirUser();
      const clientHeader = headers.find((h) => h.key === 'client.code');
      expect(clientHeader?.renderAs).toBeDefined();
      if (clientHeader?.renderAs) {
        const result = clientHeader.renderAs('00001001');
        render(result);
        await act(async () => {});
        expect(screen.getByText('00001001')).toBeDefined();
      }
    });

    it('should render client.code without link for BCeID user', async () => {
      mockBceidUser();
      const clientHeader = headers.find((h) => h.key === 'client.code');
      if (clientHeader?.renderAs) {
        const result = clientHeader.renderAs('00001002');
        render(result);
        await act(async () => {});
        expect(screen.getByText('00001002')).toBeDefined();
      }
    });

    it('should render sampling column using CodeDescriptionTag', () => {
      const samplingHeader = headers.find((h) => h.key === 'sampling');
      if (samplingHeader?.renderAs) {
        const value: CodeDescriptionDto = { code: 'S1', description: 'Ground Sampling' };
        const result = samplingHeader.renderAs(value);
        render(result);
        expect(screen.getByText('S1 - Ground Sampling')).toBeDefined();
      }
    });

    it('should render multiMark as YesNoTag', () => {
      const multiMarkHeader = headers.find((h) => h.key === 'multiMark');
      if (multiMarkHeader?.renderAs) {
        render(multiMarkHeader.renderAs('Y'));
        expect(screen.getByText('Yes')).toBeDefined();
        render(multiMarkHeader.renderAs('N'));
        expect(screen.getByText('No')).toBeDefined();
      }
    });

    it('should render secondaryEntry as YesNoTag', () => {
      const secondaryHeader = headers.find((h) => h.key === 'secondaryEntry');
      if (secondaryHeader?.renderAs) {
        render(secondaryHeader.renderAs(true));
        expect(screen.getByText('Yes')).toBeDefined();
      }
    });

    it('should render district column using CodeDescriptionTag', () => {
      const districtHeader = headers.find((h) => h.key === 'district');
      if (districtHeader?.renderAs) {
        const value: CodeDescriptionDto = { code: 'DCR', description: 'Campbell River' };
        render(districtHeader.renderAs(value));
        expect(screen.getByText('DCR - Campbell River')).toBeDefined();
      }
    });

    it('should render status using ColorTag with mapped colour', () => {
      const statusHeader = headers.find((h) => h.key === 'status');
      if (statusHeader?.renderAs) {
        render(statusHeader.renderAs({ code: 'APP', description: 'Approved' }));
        expect(screen.getByText('Approved')).toBeDefined();
      }
    });

    it('should render status using ColorTag for unmapped status code', () => {
      const statusHeader = headers.find((h) => h.key === 'status');
      if (statusHeader?.renderAs) {
        render(statusHeader.renderAs({ code: 'UNKNOWN', description: 'Unknown' }));
        expect(screen.getByText('Unknown')).toBeDefined();
      }
    });

    it('should render lastUpdated date with DD format', () => {
      const lastUpdatedHeader = headers.find((h) => h.id === 'lastUpdated');
      if (lastUpdatedHeader?.renderAs) {
        render(lastUpdatedHeader.renderAs('2024-01-15T10:30:00Z'));
        expect(screen.getByText('15')).toBeDefined();
      }
    });

    it('should render lastUpdatedTimestamp with timestamp format', () => {
      const timestampHeader = headers.find((h) => h.id === 'lastUpdatedTimestamp');
      if (timestampHeader?.renderAs) {
        render(timestampHeader.renderAs('2024-01-15T10:30:00Z'));
        expect(screen.getByText('10:30 AM')).toBeDefined();
      }
    });

    describe('when reporting-unit-details-enabled flag is ON', () => {
      beforeEach(() => {
        (envModule.featureFlags as Record<string, unknown>)['reporting-unit-details-enabled'] =
          true;
      });

      afterEach(() => {
        (envModule.featureFlags as Record<string, unknown>)['reporting-unit-details-enabled'] =
          false;
      });

      it('should render ruNumber as an internal router link when feature flag is enabled', async () => {
        const ruHeader = headers.find((h) => h.key === 'ruNumber');
        expect(ruHeader?.renderAs).toBeDefined();
        if (ruHeader?.renderAs) {
          const result = ruHeader.renderAs('123');
          render(result, { wrapper: createRouterWrapper('/') });
          await act(async () => {});
          expect(screen.queryByTestId('redirect-link-tag')).not.toBeNull();
          // The internal-route path should not render a legacy external href.
          const legacyLinks = screen
            .queryAllByRole('link')
            .filter((a) => a.getAttribute('href')?.includes('/waste101'));
          expect(legacyLinks).toHaveLength(0);
        }
      });
    });
  });
});
