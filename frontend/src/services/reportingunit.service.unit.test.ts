/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ZodError } from 'zod';

import { ReportingUnitService } from './reportingunit.service';
import { reportingUnitSchema, codeDescriptionSchema } from './reportingUnit.types';

import type { ReportingUnitDto } from './reportingUnit.types';

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

    it('throws a descriptive Error when the response fails Zod validation', async () => {
      const malformed = { id: 'not-a-number', client: validCodeDescription };
      (service as any).doRequest = vi.fn().mockResolvedValue(malformed);

      await expect(service.getReportingUnit(7)).rejects.toThrow(
        'Reporting unit 7 has an unexpected data structure:',
      );
    });

    it('does not expose ZodError directly — wraps it in a plain Error', async () => {
      (service as any).doRequest = vi.fn().mockResolvedValue({ id: null });

      const error = await service.getReportingUnit(7).catch((e) => e);

      expect(error).toBeInstanceOf(Error);
      expect(error).not.toBeInstanceOf(ZodError);
    });

    it('re-throws non-Zod errors (e.g. network / ApiError) unchanged', async () => {
      const networkError = new Error('Network failure');
      (service as any).doRequest = vi.fn().mockRejectedValue(networkError);

      await expect(service.getReportingUnit(1)).rejects.toThrow('Network failure');
    });

    it('propagates the original error reference for non-Zod rejections', async () => {
      const originalError = new TypeError('Unexpected token');
      (service as any).doRequest = vi.fn().mockRejectedValue(originalError);

      const caught = await service.getReportingUnit(1).catch((e) => e);

      expect(caught).toBe(originalError);
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
});
