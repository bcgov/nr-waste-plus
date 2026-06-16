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
        'Section': 'Mature',
        'District': 'DCC',
        'Avoidable sawlog': 5.5,
        'Avoidable Hembal Grade U': 1.2,
        'Avoidable Grade Y': 0.8,
        'Unavoidable': 0.5,
        'Total': 8.0,
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
        'Section': 'Immature',
        'District': 'DSC',
        'Avoidable sawlog': 3.0,
        'Avoidable Hembal Grade U': 0.5,
        'Avoidable Grade Y': 0.2,
        'Unavoidable': 0.1,
        'Total': 3.8,
      },
    ];

    const result = mapCoastSpreadsheet(rows);
    const immature = result.sections.find((s) => s.name === 'Immature')!;
    expect(immature.districts).toHaveLength(1);
    expect(immature.districts[0].code).toBe('DSC');
  });

  it('skips rows with unrecognised section names', () => {
    const rows = [
      { Section: 'Unknown', District: 'DCC', Total: 5 },
      { Section: 'INVALID', District: 'DSC', Total: 3 },
    ];

    const result = mapCoastSpreadsheet(rows);
    const totalDistricts = result.sections.flatMap((s) => s.districts).length;
    expect(totalDistricts).toBe(0);
  });

  it('skips rows with empty district code', () => {
    const rows = [
      { Section: 'Mature', District: '', Total: 5 },
      { Section: 'Immature', District: '   ', Total: 3 },
    ];

    const result = mapCoastSpreadsheet(rows);
    // '   '.trim() is '' which is falsy — both rows skipped
    const totalDistricts = result.sections.flatMap((s) => s.districts).length;
    expect(totalDistricts).toBe(0);
  });

  it('missing numeric columns default to 0', () => {
    const rows = [{ Section: 'Mature', District: 'DCC' }];

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
        'Section': 'Mature',
        'District': 'DCC',
        'Avoidable sawlog': '4.5',
        'Avoidable Hembal Grade U': '1.0',
        'Avoidable Grade Y': '0.5',
        'Unavoidable': '0.2',
        'Total': '6.2',
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
      { Section: 'Mature', District: 'DCC', Total: 5 }, // valid
      { Section: 'Unknown', District: 'DXX', Total: 5 }, // bad section
      { Section: 'Immature', District: '', Total: 3 }, // empty district
      { Section: 'Immature', District: 'DSC', Total: 2 }, // valid
    ];

    const result = mapCoastSpreadsheet(rows);
    const totalDistricts = result.sections.flatMap((s) => s.districts).length;
    expect(totalDistricts).toBe(2);
  });

  it('other section remains empty when only one section has rows', () => {
    const rows = [{ Section: 'Mature', District: 'DCC', Total: 1 }];

    const result = mapCoastSpreadsheet(rows);
    const immature = result.sections.find((s) => s.name === 'Immature')!;
    expect(immature.districts).toHaveLength(0);
  });

  it('multiple rows in the same section are all collected', () => {
    const rows = [
      { Section: 'Mature', District: 'DCC', Total: 1 },
      { Section: 'Mature', District: 'DSC', Total: 2 },
      { Section: 'Mature', District: 'DVA', Total: 3 },
    ];

    const result = mapCoastSpreadsheet(rows);
    const mature = result.sections.find((s) => s.name === 'Mature')!;
    expect(mature.districts).toHaveLength(3);
  });
});
