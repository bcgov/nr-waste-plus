import { describe, it, expect } from 'vitest';

import {
  reportingUnitSearchParametersConverterMap,
  reportingUnitSearchParametersView2Plain,
  getCodeDescriptionArrayConverter,
} from './search.utils';

import type { CodeDescriptionDto } from '@/types/search.types';

describe('search.utils', () => {
  describe('reportingUnitSearchParametersConverterMap', () => {
    it('clientNumbers converter filters out null codes', () => {
      const values: CodeDescriptionDto[] = [
        { code: '001', description: 'A', areas: null },
        { code: null, description: 'B', areas: null },
        { code: '002', description: 'C', areas: [] },
      ];
      const result = reportingUnitSearchParametersConverterMap.clientNumbers(values);
      expect(result).toEqual(['001', '002']);
    });

    it('clientNumbers converter returns undefined when value is undefined', () => {
      const result = reportingUnitSearchParametersConverterMap.clientNumbers(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('getCodeDescriptionArrayConverter', () => {
    it('returns custom converter for clientNumbers', () => {
      const converter = getCodeDescriptionArrayConverter('clientNumbers');
      const values: CodeDescriptionDto[] = [{ code: '123', description: 'Test', areas: null }];
      expect(converter(values)).toEqual(values);
    });

    it('returns default converter for other keys', () => {
      const converter = getCodeDescriptionArrayConverter(
        'district' as keyof typeof import('@/types/search.types').ReportingUnitSearchParametersViewDto,
      );
      const values: CodeDescriptionDto[] = [
        { code: 'D1', description: 'District 1', areas: null },
        { code: null, description: null, areas: null },
      ];
      expect(converter(values)).toEqual(['D1']);
    });

    it('default converter returns undefined when value is undefined', () => {
      const converter = getCodeDescriptionArrayConverter(
        'district' as keyof typeof import('@/types/search.types').ReportingUnitSearchParametersViewDto,
      );
      expect(converter(undefined)).toBeUndefined();
    });
  });

  describe('reportingUnitSearchParametersView2Plain', () => {
    it('converts view data with clientNumbers using view-specific converter', () => {
      const viewData: Record<string, unknown> = {
        clientNumbers: [
          { code: '100', description: 'Client 1', areas: null },
          { code: '200', description: 'Client 2', areas: [] },
        ],
      };
      const result = reportingUnitSearchParametersView2Plain(viewData);
      expect(result).toEqual({ clientNumbers: ['100', '200'] });
    });

    it('passes through non-view-specific fields as-is', () => {
      const viewData: Record<string, unknown> = {
        mainSearchTerm: 'test',
        district: ['D1', 'D2'],
        requestByMe: true,
      };
      const result = reportingUnitSearchParametersView2Plain(viewData);
      expect(result).toEqual({
        mainSearchTerm: 'test',
        district: ['D1', 'D2'],
        requestByMe: true,
      });
    });

    it('handles mixed view-specific and regular fields', () => {
      const viewData: Record<string, unknown> = {
        clientNumbers: [
          { code: '999', description: 'X', areas: null },
          { code: null, description: 'Y', areas: null },
        ],
        mainSearchTerm: 'search',
        status: ['ACTIVE'],
      };
      const result = reportingUnitSearchParametersView2Plain(viewData);
      expect(result).toEqual({
        clientNumbers: ['999'],
        mainSearchTerm: 'search',
        status: ['ACTIVE'],
      });
    });

    it('returns empty object for empty view data', () => {
      const result = reportingUnitSearchParametersView2Plain({});
      expect(result).toEqual({});
    });
  });
});
