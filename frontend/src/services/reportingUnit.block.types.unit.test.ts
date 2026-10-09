import { describe, expect, it } from 'vitest';

import {
  blockCreateRequestSchema,
  blockCreateResponseSchema,
  blockDetailsSchema,
  reportingUnitSchema,
} from './reportingUnit.types';

describe('reporting-unit block contracts', () => {
  it('shouldAcceptDistrictAverageBlockCreateRequest', () => {
    expect(
      blockCreateRequestSchema.parse({
        blockType: 'DISTRICT_AVERAGE',
        expectedReportingUnitState: 'SUBMISSION',
      }),
    ).toEqual({
      blockType: 'DISTRICT_AVERAGE',
      expectedReportingUnitState: 'SUBMISSION',
    });
  });

  it('shouldRejectUnsupportedBlockCreateType', () => {
    expect(() =>
      blockCreateRequestSchema.parse({
        blockType: 'OTHER',
        expectedReportingUnitState: 'SUBMISSION',
      }),
    ).toThrow();
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

  it('shouldParseBlockDetailsAndAllowFutureFields', () => {
    const details = {
      id: 12,
      reportingUnitId: 468,
      blockType: 'DISTRICT_AVERAGE',
      draft: true,
      plcDate: '2026-01-15',
      revision: 0,
      isLegacy: false,
      futureField: 'preserved',
    };

    expect(blockDetailsSchema.parse(details)).toEqual(details);
  });

  it('shouldParseBlockDetailsWithNullOptionalFields', () => {
    const details = {
      id: 12,
      reportingUnitId: 468,
      blockType: null,
      draft: false,
      plcDate: null,
      revision: null,
      isLegacy: true,
    };

    expect(blockDetailsSchema.parse(details)).toEqual(details);
  });

  it.each(['id', 'reportingUnitId', 'blockType', 'draft', 'plcDate', 'revision', 'isLegacy'])(
    'shouldRejectBlockDetailsWithoutRequiredField_%s',
    (field) => {
      const details = {
        id: 12,
        reportingUnitId: 468,
        blockType: 'DISTRICT_AVERAGE',
        draft: true,
        plcDate: '2026-01-15',
        revision: 0,
        isLegacy: false,
      };
      delete details[field as keyof typeof details];

      expect(() => blockDetailsSchema.parse(details)).toThrow();
    },
  );
});
