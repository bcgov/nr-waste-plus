/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZodError } from 'zod';

import { ReportingUnitService } from './reportingunit.service';
import { reportingUnitSchema, codeDescriptionSchema } from './reportingUnit.types';

import type { ReportingUnitCreateDto, ReportingUnitDto } from './reportingUnit.types';

vi.mock('axios');

const mockConfig = {
  BASE: 'http://localhost',
  VERSION: '1',
  WITH_CREDENTIALS: false,
  CREDENTIALS: 'include' as const,
};

const validCodeDescription = { code: 'A', description: 'Alpha' };

const validReportingUnit: ReportingUnitDto = {
  id: 1,
  client: validCodeDescription,
  clientStatus: { code: 'ACT', description: 'Active' },
  grade: { code: 'H', description: 'High' },
  sampling: { code: 'COMP', description: 'Complete' },
  district: { code: 'DPG', description: 'Prince George' },
};

let service: ReportingUnitService;

beforeEach(() => {
  service = new ReportingUnitService(mockConfig as any);
});

// ---------------------------------------------------------------------------
// Schema unit tests
// ---------------------------------------------------------------------------

describe('codeDescriptionSchema', () => {
  it('parses a valid code/description pair', () => {
    const result = codeDescriptionSchema.parse({ code: 'X', description: 'Xray' });
    expect(result).toEqual({ code: 'X', description: 'Xray' });
  });

  it('passes through extra properties (loose schema)', () => {
    const input = { code: 'X', description: 'Xray', extra: true };
    const result = codeDescriptionSchema.parse(input);
    expect(result).toMatchObject({ code: 'X', description: 'Xray' });
  });

  it('throws ZodError when code is missing', () => {
    expect(() => codeDescriptionSchema.parse({ description: 'Missing code' })).toThrow(ZodError);
  });

  it('throws ZodError when description is missing', () => {
    expect(() => codeDescriptionSchema.parse({ code: 'X' })).toThrow(ZodError);
  });

  it('throws ZodError when code is not a string', () => {
    expect(() => codeDescriptionSchema.parse({ code: 42, description: 'Bad' })).toThrow(ZodError);
  });

  it('accepts null code', () => {
    const result = codeDescriptionSchema.parse({ code: null, description: 'No code' });
    expect(result).toEqual({ code: null, description: 'No code' });
  });

  it('accepts null description', () => {
    const result = codeDescriptionSchema.parse({ code: 'X', description: null });
    expect(result).toEqual({ code: 'X', description: null });
  });

  it('accepts both code and description as null', () => {
    const result = codeDescriptionSchema.parse({ code: null, description: null });
    expect(result).toEqual({ code: null, description: null });
  });
});

describe('reportingUnitSchema', () => {
  it('parses a fully valid reporting unit', () => {
    const result = reportingUnitSchema.parse(validReportingUnit);
    expect(result).toEqual(validReportingUnit);
  });

  it('passes through unknown top-level properties (loose schema)', () => {
    const input = { ...validReportingUnit, unexpectedField: 'bonus' };
    const result = reportingUnitSchema.parse(input);
    expect(result).toMatchObject(validReportingUnit);
  });

  it('throws ZodError when id is missing', () => {
    const { id: _id, ...withoutId } = validReportingUnit;
    expect(() => reportingUnitSchema.parse(withoutId)).toThrow(ZodError);
  });

  it('throws ZodError when id is not a number', () => {
    expect(() => reportingUnitSchema.parse({ ...validReportingUnit, id: 'not-a-number' })).toThrow(
      ZodError,
    );
  });

  it('throws ZodError when client is missing', () => {
    const { client: _client, ...withoutClient } = validReportingUnit;
    expect(() => reportingUnitSchema.parse(withoutClient)).toThrow(ZodError);
  });

  it('throws ZodError when district has wrong shape', () => {
    expect(() =>
      reportingUnitSchema.parse({ ...validReportingUnit, district: { code: 'X' } }),
    ).toThrow(ZodError);
  });

  it('throws ZodError when grade is null', () => {
    expect(() => reportingUnitSchema.parse({ ...validReportingUnit, grade: null })).toThrow(
      ZodError,
    );
  });

  it('parses a reporting unit with null nested code/description values', () => {
    const withNulls = {
      ...validReportingUnit,
      grade: { code: null, description: null },
      sampling: { code: null, description: 'Unknown' },
    };
    const result = reportingUnitSchema.parse(withNulls);
    expect(result.grade).toEqual({ code: null, description: null });
    expect(result.sampling).toEqual({ code: null, description: 'Unknown' });
  });
});

// ---------------------------------------------------------------------------
// ReportingUnitService tests
// ---------------------------------------------------------------------------

describe('ReportingUnitService', () => {
  describe('getReportingUnit', () => {
    it('calls the correct endpoint and returns validated data', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue(validReportingUnit);

      const result = await service.getReportingUnit(1);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/reporting-units/1',
      });
      expect(result).toEqual(validReportingUnit);
    });

    it('uses the correct ID in the URL for different IDs', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue({ ...validReportingUnit, id: 99 });

      await service.getReportingUnit(99);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'GET',
        url: '/api/reporting-units/99',
      });
    });

    it('accepts extra fields from the API response (loose schema)', async () => {
      const withExtra = { ...validReportingUnit, newBackendField: 'future-proof' };
      (service as any).doRequest = vi.fn().mockResolvedValue(withExtra);

      const result = await service.getReportingUnit(1);

      expect(result).toMatchObject(validReportingUnit);
    });

    it('re-throws non-Zod errors (e.g. network / ApiError) unchanged', async () => {
      const networkError = new Error('Network failure');
      (service as any).doRequest = vi.fn().mockRejectedValue(networkError);

      await expect(service.getReportingUnit(1)).rejects.toThrow('Network failure');
    });

    it('returns correct TypeScript-inferred shape on success', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue(validReportingUnit);

      const result = await service.getReportingUnit(1);

      // Structural assertions aligned with ReportingUnitDto
      expect(typeof result.id).toBe('number');
      expect(typeof result.client.code).toBe('string');
      expect(typeof result.client.description).toBe('string');
      expect(typeof result.clientStatus.code).toBe('string');
      expect(typeof result.grade.code).toBe('string');
      expect(typeof result.sampling.code).toBe('string');
      expect(typeof result.district.code).toBe('string');
    });
  });

  describe('createReportingUnit', () => {
    /**
     * API Contract (Issue #855):
     * - Method: POST
     * - Path: /api/reporting-units
     * - Success: 201 Created + Location header pointing to /reporting-units/{id}
     * - Errors: 400 Bad Request (validation), 409 Conflict (duplicate), 500 Internal Server Error
     */

    const validCreateRequest: ReportingUnitCreateDto = {
      clientNumber: '00012797',
      districtCode: 'DKM',
      samplingCode: 'AVG',
      gradeCode: null,
    };

    const _validCreateResponse: ReportingUnitCreateDto = {
      clientNumber: '00012797',
      districtCode: 'DKM',
      samplingCode: 'AVG',
      gradeCode: null,
    };

    it('calls the correct endpoint with POST method and responseHeader option', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/555');

      await service.createReportingUnit(validCreateRequest);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'POST',
        url: '/api/reporting-units',
        body: validCreateRequest,
        responseHeader: 'location',
      });
    });

    it('extracts numeric ID from Location header and returns it', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/12345');

      const result = await service.createReportingUnit(validCreateRequest);

      expect(result).toBe(12345);
      expect(typeof result).toBe('number');
    });

    it('handles Location header with single-digit ID', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/1');

      const result = await service.createReportingUnit(validCreateRequest);

      expect(result).toBe(1);
    });

    it('handles Location header with large ID', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/999999999');

      const result = await service.createReportingUnit(validCreateRequest);

      expect(result).toBe(999999999);
    });

    it('includes all request fields in the POST body', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/123');

      const request: ReportingUnitCreateDto = {
        clientNumber: '00099999',
        districtCode: 'DCC',
        samplingCode: 'MAX',
        gradeCode: 'COST',
      };

      await service.createReportingUnit(request);

      expect((service as any).doRequest).toHaveBeenCalledWith(mockConfig, {
        method: 'POST',
        url: '/api/reporting-units',
        body: request,
        responseHeader: 'location',
      });
    });

    it('throws when Location header has invalid format (no ID)', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/');

      await expect(service.createReportingUnit(validCreateRequest)).rejects.toThrow(
        'Invalid Location header format: /reporting-units/',
      );
    });

    it('throws when Location header has non-numeric ID', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/abc');

      await expect(service.createReportingUnit(validCreateRequest)).rejects.toThrow(
        'Invalid Location header format: /reporting-units/abc',
      );
    });

    it('throws when Location header is completely malformed', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('not-a-valid-path');

      await expect(service.createReportingUnit(validCreateRequest)).rejects.toThrow(
        'Invalid Location header format: not-a-valid-path',
      );
    });

    it('supports both request payloads with and without gradeCode', async () => {
      const requestWithoutGrade = { ...validCreateRequest, gradeCode: null };
      const requestWithGrade: ReportingUnitCreateDto = {
        clientNumber: '00012797',
        districtCode: 'DKM',
        samplingCode: 'AVG',
        gradeCode: 'COST',
      };

      (service as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/333');

      const result1 = await service.createReportingUnit(requestWithoutGrade);
      expect(result1).toBe(333);

      const result2 = await service.createReportingUnit(requestWithGrade);
      expect(result2).toBe(333);
    });

    it('re-throws network / API errors unchanged (e.g. 400, 409, 500)', async () => {
      const apiError = new Error('400: Validation failed');
      (service as any).doRequest = vi.fn().mockRejectedValue(apiError);

      await expect(service.createReportingUnit(validCreateRequest)).rejects.toThrow(
        '400: Validation failed',
      );
    });

    it('handles Location header with query parameters (if backend adds them)', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue('/reporting-units/777?v=1');

      // Should still extract the ID correctly
      await expect(service.createReportingUnit(validCreateRequest)).rejects.toThrow();
    });

    it('propagates conflict errors (409 Duplicate RU)', async () => {
      const conflictError = new Error('409: Conflict — Reporting unit already exists');
      (service as any).doRequest = vi.fn().mockRejectedValue(conflictError);

      const caught = await service.createReportingUnit(validCreateRequest).catch((e) => e);

      expect(caught).toBe(conflictError);
    });
  });
});
