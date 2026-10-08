/**
 * Unit tests for {@link module:api/resources/search-resource}.
 *
 * @module api/resources/search-resource.unit.test
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// setup-env.ts globally mocks this module for component tests; re-register it
// with the real implementation (test-file mocks take precedence) so the
// resource itself is under test.
vi.mock('./search-resource', async (importOriginal) => await importOriginal());

import { SearchResource } from './search-resource';

import type { PageableRequest } from '@/api/pagination.types';
import type {
  ReportingUnitSearchParametersDto,
  ReportingUnitSearchResultDto,
} from '@/api/search.types';
import type { RequestContext, ResponseContext } from '@/http/types';

// ── Helpers ─────────────────────────────────────────────────────────

const ok = (data: unknown, overrides: Partial<ResponseContext> = {}): ResponseContext => ({
  data,
  status: 200,
  statusText: 'OK',
  headers: {},
  meta: {},
  config: { url: '/api/search', method: 'GET' },
  ...overrides,
});

const emptyFilters = {} as ReportingUnitSearchParametersDto;

// ── Suite ───────────────────────────────────────────────────────────

describe('SearchResource', () => {
  const transport = vi.fn<(ctx: RequestContext) => Promise<ResponseContext>>();
  let resource: SearchResource;

  beforeEach(() => {
    vi.clearAllMocks();
    resource = new SearchResource(transport);
  });

  const sentCtx = (): RequestContext => transport.mock.calls[0]?.[0] as RequestContext;

  // ── searchReportingUnit ──────────────────────────────────────────

  it('merges cleaned filters and pageable into query params', async () => {
    transport.mockResolvedValue(ok({ content: [] }));

    const filters = {
      district: ['DKM'],
      clientNumber: '',
      status: undefined,
    } as unknown as ReportingUnitSearchParametersDto;
    const pageable = {
      page: 0,
      size: 25,
      sort: ['ruNumber,ASC'],
    } as PageableRequest<ReportingUnitSearchResultDto>;

    await resource.searchReportingUnit(filters, pageable);

    expect(sentCtx().config.url).toBe('/api/search/reporting-units');
    // removeEmpty strips falsy scalars — `page: 0` is omitted on the wire
    // (Spring defaults to page 0). This preserves the pre-migration query
    // string byte-for-byte.
    expect(sentCtx().config.params).toEqual({
      district: ['DKM'],
      size: 25,
      sort: ['ruNumber,ASC'],
    });
  });

  it('drops empty arrays and empty strings from params (removeEmpty)', async () => {
    transport.mockResolvedValue(ok({ content: [] }));

    const filters = {
      clientNumber: '',
      district: [],
      sampling: null,
    } as unknown as ReportingUnitSearchParametersDto;

    await resource.searchReportingUnit(filters, {
      page: 0,
      size: 10,
    } as PageableRequest<ReportingUnitSearchResultDto>);

    // page:0 is falsy → stripped by removeEmpty (pre-migration parity)
    expect(sentCtx().config.params).toEqual({ size: 10 });
  });

  it('forwards signal and meta for cancellation and notification routing', async () => {
    transport.mockResolvedValue(ok({ content: [] }));
    const controller = new AbortController();

    await resource.searchReportingUnit(
      emptyFilters,
      { page: 0, size: 10 } as PageableRequest<ReportingUnitSearchResultDto>,
      { signal: controller.signal, meta: { notificationTarget: 'waste-search' } },
    );

    expect(sentCtx().config.signal).toBe(controller.signal);
    expect(sentCtx().meta).toEqual({ notificationTarget: 'waste-search' });
  });

  // ── getReportingUnitSearchExpand ─────────────────────────────────

  it('builds the expand URL from both identifiers', async () => {
    transport.mockResolvedValue(ok({ id: 1 }));

    await resource.getReportingUnitSearchExpand(42, 7);

    expect(sentCtx().config.url).toBe('/api/search/reporting-units/ex/42/7');
  });

  // ── searchReportingUnitUsers ─────────────────────────────────────

  it('searches reporting-unit submitters by userId param', async () => {
    transport.mockResolvedValue(ok(['IDIR/JDOE']));

    await resource.searchReportingUnitUsers('JDO');

    expect(sentCtx().config).toMatchObject({
      url: '/api/search/reporting-units-users',
      params: { userId: 'JDO' },
    });
  });
});
