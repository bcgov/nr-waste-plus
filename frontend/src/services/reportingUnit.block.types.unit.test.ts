import { describe, expect, it } from 'vitest';

import {
  blockCreateRequestSchema,
  blockCreateResponseSchema,
  reportingUnitSchema,
} from './reportingUnit.types';

describe('reporting-unit block contracts', () => {
  it('shouldAcceptDistrictAverageBlockCreateRequest', () => {
    expect(blockCreateRequestSchema.parse({ blockType: 'DISTRICT_AVERAGE' })).toEqual({
      blockType: 'DISTRICT_AVERAGE',
    });
  });

  it('shouldRejectUnsupportedBlockCreateType', () => {
    expect(() => blockCreateRequestSchema.parse({ blockType: 'OTHER' })).toThrow();
  });

  it('shouldValidateBlockCreateResponseAndAllowFutureFields', () => {
    const response = {
      id: 12,
      reportingUnitId: 468,
      blockType: 'DISTRICT_AVERAGE',
      state: 'DRAFT',
      version: 0,
      createdAt: null,
      updatedAt: '2026-10-07T12:30:00.000Z',
      futureField: 'preserved',
    };

    expect(blockCreateResponseSchema.parse(response)).toEqual(response);
  });

  it.each(['id', 'reportingUnitId', 'blockType', 'state', 'version', 'createdAt', 'updatedAt'])(
    'shouldRejectBlockCreateResponseWithoutRequiredField_%s',
    (field) => {
      const response = {
        id: 12,
        reportingUnitId: 468,
        blockType: 'DISTRICT_AVERAGE',
        state: 'DRAFT',
        version: 0,
        createdAt: null,
        updatedAt: null,
      };
      delete response[field as keyof typeof response];

      expect(() => blockCreateResponseSchema.parse(response)).toThrow();
    },
  );

  it('shouldParseOptionalBlockRuleAndLegacySourceMarker', () => {
    const reportingUnit = {
      id: 468,
      client: { code: '00002022', description: 'Forest client' },
      clientStatus: { code: 'ACT', description: 'Active' },
      grade: { code: 'IN', description: 'Interior' },
      sampling: { code: 'AVG', description: 'District Average' },
      district: { code: 'DKM', description: 'Coast Mountains' },
      blockRule: { maxBlocks: 1, blockType: 'DISTRICT_AVERAGE' },
      isLegacy: false,
    };

    expect(reportingUnitSchema.parse(reportingUnit)).toMatchObject({
      blockRule: { maxBlocks: 1, blockType: 'DISTRICT_AVERAGE' },
      isLegacy: false,
    });
  });

  it.each([
    { maxBlocks: '1', blockType: 'DISTRICT_AVERAGE' },
    { maxBlocks: 1, blockType: 'OTHER' },
  ])('shouldRejectInvalidBlockRule($maxBlocks, $blockType)', (blockRule) => {
    const reportingUnit = {
      id: 468,
      client: { code: null, description: null },
      clientStatus: { code: null, description: null },
      grade: { code: null, description: null },
      sampling: { code: null, description: null },
      district: { code: null, description: null },
      blockRule,
    };

    expect(() => reportingUnitSchema.parse(reportingUnit)).toThrow();
  });
});
