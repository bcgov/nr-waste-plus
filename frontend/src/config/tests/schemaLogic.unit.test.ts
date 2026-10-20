import { describe, expect, it } from 'vitest';

import { districtVolumeDetailSchema } from '@/types/districtvolumes.types';

/**
 * Focused tests for schema logic (defaults) in the district-volume table-data
 * schemas. Plain declarative schemas deliberately have no tests here.
 */
// The sub-schemas (interiorData/coastData) are private per R2 — the default
// behaviour is exercised through the exported detail union instead.
const interiorDetail = {
  id: 1,
  area: 'INTERIOR' as const,
  startDate: '2026-01-01',
  endDate: null,
  uploadedBy: 'IDIR\\TEST',
  dateOfUpload: '2026-01-01T00:00:00Z',
  tableLevelFactor: 1,
  tableData: {
    type: 'INTERIOR' as const,
    zones: [
      {
        name: 'Dry belt' as const,
        districts: [
          { code: 'DKM', avoidableSawlog: 1, avoidableGrade4: 0, unavoidableGrade4: 0, total: 1 },
        ],
      },
    ],
  },
};

const coastDetail = {
  ...interiorDetail,
  area: 'COASTAL' as const,
  heliMultiplier: 3.47,
  tableData: {
    type: 'COASTAL' as const,
    sections: [
      {
        name: 'Mature' as const,
        districts: [
          {
            code: 'DCC',
            avoidableSawlog: 1,
            avoidableHembalGradeU: 0,
            avoidableGradeY: 0,
            unavoidable: 0,
            total: 1,
          },
        ],
      },
    ],
  },
};

describe('district-volume table-data schema defaults', () => {
  it('defaults formulas to an empty object when absent (interior)', () => {
    const result = districtVolumeDetailSchema.parse(interiorDetail);
    expect(result.tableData.formulas).toEqual({});
  });

  it('defaults formulas to an empty object when absent (coast)', () => {
    const result = districtVolumeDetailSchema.parse(coastDetail);
    expect(result.tableData.formulas).toEqual({});
  });

  it('keeps provided formulas (interior)', () => {
    const formulas = { 'da.rate': 0.15 };
    const result = districtVolumeDetailSchema.parse({
      ...interiorDetail,
      tableData: { ...interiorDetail.tableData, formulas },
    });
    expect(result.tableData.formulas).toEqual(formulas);
  });

  it('rejects a malformed zone row (interior)', () => {
    const result = districtVolumeDetailSchema.safeParse({
      ...interiorDetail,
      tableData: {
        ...interiorDetail.tableData,
        zones: [{ name: 'Dry belt', districts: [{ code: 42 }] }],
      },
    });
    expect(result.success).toBe(false);
  });
});
