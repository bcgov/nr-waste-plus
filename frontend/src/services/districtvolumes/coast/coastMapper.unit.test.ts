import { describe, it, expect } from 'vitest';

import { mapCoastSpreadsheet } from './coastMapper';

describe('mapCoastSpreadsheet', () => {
  it('returns type COASTAL', () => {
    const result = mapCoastSpreadsheet([]);
    expect(result.type).toBe('COASTAL');
  });

  it('returns formulas as empty object', () => {
    const result = mapCoastSpreadsheet([]);
    expect(result.formulas).toEqual({});
  });

  it('always initialises both sections even when rows are empty', () => {
    const result = mapCoastSpreadsheet([]);
    const names = result.sections.map((s) => s.name);
    expect(names).toContain('Mature');
    expect(names).toContain('Immature');
    expect(result.sections).toHaveLength(2);
  });

  it('happy path — row with Section=Mature and a District lands in Mature section', () => {
    const rows = [
      {
        section: 'Mature',
        district: 'DCC',
        avoidableSawlog: 5.5,
        avoidableHembalGradeU: 1.2,
        avoidableGradeY: 0.8,
        unavoidable: 0.5,
        total: 8.0,
      },
    ];

    const result = mapCoastSpreadsheet(rows);
    const mature = result.sections.find((s) => s.name === 'Mature')!;
    expect(mature.districts).toHaveLength(1);
    expect(mature.districts[0].code).toBe('DCC');
    expect(mature.districts[0].avoidableSawlog).toBe(5.5);
    expect(mature.districts[0].avoidableHembalGradeU).toBe(1.2);
    expect(mature.districts[0].avoidableGradeY).toBe(0.8);
    expect(mature.districts[0].unavoidable).toBe(0.5);
    expect(mature.districts[0].total).toBe(8.0);
  });

  it('row with Section=Immature lands in Immature section', () => {
    const rows = [
      {
        section: 'Immature',
        district: 'DSC',
        avoidableSawlog: 3.0,
        avoidableHembalGradeU: 0.5,
        avoidableGradeY: 0.2,
        unavoidable: 0.1,
        total: 3.8,
      },
    ];

    const result = mapCoastSpreadsheet(rows);
    const immature = result.sections.find((s) => s.name === 'Immature')!;
    expect(immature.districts).toHaveLength(1);
    expect(immature.districts[0].code).toBe('DSC');
  });

  it('extracts 3-char code from long district names with " - " separator', () => {
    const rows = [
      {
        section: 'Mature',
        district: 'DCK - Chilliwack Natural Resource District',
        avoidableSawlog: 16.19,
        avoidableHembalGradeU: 8.87,
        avoidableGradeY: 5.24,
        unavoidable: 1.18,
        total: 31.48,
      },
    ];

    const result = mapCoastSpreadsheet(rows);
    const district = result.sections.find((s) => s.name === 'Mature')!.districts[0];
    expect(district.code).toBe('DCK');
  });

  it('uses full district code when no separator found', () => {
    const rows = [
      {
        section: 'Mature',
        district: 'DCK',
        avoidableSawlog: 1,
        avoidableHembalGradeU: 2,
        avoidableGradeY: 3,
        unavoidable: 4,
        total: 10,
      },
    ];

    const result = mapCoastSpreadsheet(rows);
    const district = result.sections.find((s) => s.name === 'Mature')!.districts[0];
    expect(district.code).toBe('DCK');
  });

  it('skips rows with unrecognised section names', () => {
    const rows = [
      { section: 'Unknown', district: 'DCC', total: 5 },
      { section: 'INVALID', district: 'DSC', total: 3 },
    ];

    const result = mapCoastSpreadsheet(rows);
    const totalDistricts = result.sections.flatMap((s) => s.districts).length;
    expect(totalDistricts).toBe(0);
  });

  it('skips rows with empty district code', () => {
    const rows = [
      { section: 'Mature', district: '', total: 5 },
      { section: 'Immature', district: '   ', total: 3 },
    ];

    const result = mapCoastSpreadsheet(rows);
    const totalDistricts = result.sections.flatMap((s) => s.districts).length;
    expect(totalDistricts).toBe(0);
  });

  it('missing numeric columns default to 0', () => {
    const rows = [{ section: 'Mature', district: 'DCC' }];

    const result = mapCoastSpreadsheet(rows);
    const district = result.sections.find((s) => s.name === 'Mature')!.districts[0];
    expect(district.avoidableSawlog).toBe(0);
    expect(district.avoidableHembalGradeU).toBe(0);
    expect(district.avoidableGradeY).toBe(0);
    expect(district.unavoidable).toBe(0);
    expect(district.total).toBe(0);
  });

  it('coerces string numbers to numbers', () => {
    const rows = [
      {
        section: 'Mature',
        district: 'DCC',
        avoidableSawlog: '4.5',
        avoidableHembalGradeU: '1.0',
        avoidableGradeY: '0.5',
        unavoidable: '0.2',
        total: '6.2',
      },
    ];

    const result = mapCoastSpreadsheet(rows);
    const district = result.sections.find((s) => s.name === 'Mature')!.districts[0];
    expect(typeof district.avoidableSawlog).toBe('number');
    expect(district.avoidableSawlog).toBe(4.5);
    expect(district.total).toBe(6.2);
  });

  it('mixed valid and invalid rows — only valid rows land in sections', () => {
    const rows = [
      { section: 'Mature', district: 'DCC', total: 5 }, // valid
      { section: 'Unknown', district: 'DXX', total: 5 }, // bad section
      { section: 'Immature', district: '', total: 3 }, // empty district
      { section: 'Immature', district: 'DSC', total: 2 }, // valid
    ];

    const result = mapCoastSpreadsheet(rows);
    const totalDistricts = result.sections.flatMap((s) => s.districts).length;
    expect(totalDistricts).toBe(2);
  });

  it('other section remains empty when only one section has rows', () => {
    const rows = [{ section: 'Mature', district: 'DCC', total: 1 }];

    const result = mapCoastSpreadsheet(rows);
    const immature = result.sections.find((s) => s.name === 'Immature')!;
    expect(immature.districts).toHaveLength(0);
  });

  it('multiple rows in the same section are all collected', () => {
    const rows = [
      { section: 'Mature', district: 'DCC', total: 1 },
      { section: 'Mature', district: 'DSC', total: 2 },
      { section: 'Mature', district: 'DVA', total: 3 },
    ];

    const result = mapCoastSpreadsheet(rows);
    const mature = result.sections.find((s) => s.name === 'Mature')!;
    expect(mature.districts).toHaveLength(3);
  });
});
