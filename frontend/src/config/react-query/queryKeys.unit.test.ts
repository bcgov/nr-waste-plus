import { describe, expect, it } from 'vitest';

import { queryKeys, type ReportingUnitsQueryParams } from './queryKeys';

describe('queryKeys', () => {
  describe('codes', () => {
    it('should build samplingOptions key without notificationTarget', () => {
      expect(queryKeys.codes.samplingOptions()).toEqual(['codes', 'sampling-options', undefined]);
    });

    it('should include notificationTarget in samplingOptions key', () => {
      expect(queryKeys.codes.samplingOptions('panel-1')).toEqual([
        'codes',
        'sampling-options',
        'panel-1',
      ]);
    });

    it('should build districtOptions key', () => {
      expect(queryKeys.codes.districtOptions()).toEqual(['codes', 'district-options', undefined]);
    });

    it('should build statusOptions key', () => {
      expect(queryKeys.codes.statusOptions()).toEqual(['codes', 'status-options', undefined]);
    });
  });

  describe('preference', () => {
    it('should build userPreference key', () => {
      expect(queryKeys.preference.userPreference()).toEqual(['preference', 'user']);
    });
  });

  describe('search', () => {
    it('should build reportingUnits key', () => {
      const params: ReportingUnitsQueryParams = {
        page: 0,
        size: 10,
        filters: {},
        sort: { ruNumber: 'ASC' },
      };
      const key = queryKeys.search.reportingUnits(params);
      expect(key[0]).toBe('search');
      expect(key[1]).toBe('reporting-units');
      expect(key[2]).toBe(params);
    });

    it('should include notificationTarget in reportingUnits key', () => {
      const params: ReportingUnitsQueryParams = { page: 0, size: 5, filters: {}, sort: {} };
      const key = queryKeys.search.reportingUnits(params, 'my-target');
      expect(key[3]).toBe('my-target');
    });

    it('should build reportingUnitExpand key', () => {
      const key = queryKeys.search.reportingUnitExpand('row-1', 10, 20);
      expect(key).toEqual([
        'search',
        'reporting-unit-expand',
        { rowId: 'row-1', ruId: 10, wasteAssessmentAreaId: 20 },
      ]);
    });

    it('should build reportingUnitExpand key with null IDs', () => {
      const key = queryKeys.search.reportingUnitExpand('row-2', null, null);
      expect(key[2]).toMatchObject({ rowId: 'row-2', ruId: null, wasteAssessmentAreaId: null });
    });

    it('should build reportingUnitUsers key', () => {
      expect(queryKeys.search.reportingUnitUsers('jryan')).toEqual([
        'search',
        'reporting-unit-users',
        'jryan',
      ]);
    });
  });

  describe('forestClient', () => {
    it('should build byClientNumbers key', () => {
      const key = queryKeys.forestClient.byClientNumbers(['001', '002']);
      expect(key).toEqual(['forest-client', 'by-client-numbers', ['001', '002']]);
    });

    it('should build myForestClients key', () => {
      const key = queryKeys.forestClient.myForestClients('filter', 0, 10);
      expect(key).toEqual([
        'forest-client',
        'my-forest-clients',
        { filter: 'filter', page: 0, size: 10 },
        undefined,
      ]);
    });

    it('should build lookupByClientCode key', () => {
      expect(queryKeys.forestClient.lookupByClientCode('00001001')).toEqual([
        'forest-client',
        'lookup-by-client-code',
        '00001001',
      ]);
    });
  });

  describe('autocomplete', () => {
    it('should build byFieldAndValue key', () => {
      expect(queryKeys.autocomplete.byFieldAndValue('district', 'DCR')).toEqual([
        'autocomplete',
        'district',
        'DCR',
      ]);
    });
  });

  describe('reportingUnit', () => {
    it('should build details key', () => {
      expect(queryKeys.reportingUnit.details(123)).toEqual(['reporting-unit', 'details', 123]);
    });

    it('should build create key', () => {
      expect(queryKeys.reportingUnit.create()).toEqual(['reporting-unit', 'create']);
    });
  });

  describe('table', () => {
    it('should build sorting key', () => {
      const sort = { ruNumber: 'ASC' as const };
      expect(queryKeys.table.sorting(sort)).toEqual(['table', 'sorting', sort]);
    });
  });
});
