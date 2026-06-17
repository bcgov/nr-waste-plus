import { describe, it, expect } from 'vitest';

import { mapInteriorSpreadsheet } from './interiorMapper';

describe('mapInteriorSpreadsheet', () => {
  it('returns type INTERIOR', () => {
    const result = mapInteriorSpreadsheet([]);
    expect(result.type).toBe('INTERIOR');
  });

  it('returns formulas as empty object', () => {
    const result = mapInteriorSpreadsheet([]);
    expect(result.formulas).toEqual({});
  });

  it('always initialises all three zones even when rows are empty', () => {
    const result = mapInteriorSpreadsheet([]);
    const names = result.zones.map((z) => z.name);
    expect(names).toContain('Dry belt');
    expect(names).toContain('Transition zone');
    expect(names).toContain('Wet belt');
    expect(result.zones).toHaveLength(3);
  });

  it('happy path — row with valid zone and district lands in correct zone', () => {
    const rows = [
      {
        zone: 'Dry belt',
        district: 'DPG',
        avoidableSawlog: 10.5,
        avoidableGradeY4: 2.0,
        unavoidable: 1.0,
        total: 13.5,
      },
    ];

    const result = mapInteriorSpreadsheet(rows);
    const dryBelt = result.zones.find((z) => z.name === 'Dry belt')!;
    expect(dryBelt.districts).toHaveLength(1);
    expect(dryBelt.districts[0].code).toBe('DPG');
    expect(dryBelt.districts[0].avoidableSawlog).toBe(10.5);
    expect(dryBelt.districts[0].avoidableGrade4).toBe(2.0);
    expect(dryBelt.districts[0].unavoidableGrade4).toBe(1.0);
    expect(dryBelt.districts[0].total).toBe(13.5);
  });

  it('row with Transition zone lands in Transition zone bucket', () => {
    const rows = [
      {
        zone: 'Transition zone',
        district: 'DNI',
        avoidableSawlog: 5,
        avoidableGradeY4: 1,
        unavoidable: 0.5,
        total: 6.5,
      },
    ];

    const result = mapInteriorSpreadsheet(rows);
    const transition = result.zones.find((z) => z.name === 'Transition zone')!;
    expect(transition.districts).toHaveLength(1);
    expect(transition.districts[0].code).toBe('DNI');
  });

  it('row with Wet belt lands in Wet belt bucket', () => {
    const rows = [{ zone: 'Wet belt', district: 'DKA', total: 3 }];

    const result = mapInteriorSpreadsheet(rows);
    const wetBelt = result.zones.find((z) => z.name === 'Wet belt')!;
    expect(wetBelt.districts).toHaveLength(1);
    expect(wetBelt.districts[0].code).toBe('DKA');
  });

  it('skips rows with unrecognised zone names', () => {
    const rows = [
      { zone: 'Unknown zone', district: 'DPG', total: 5 },
      { zone: 'INVALID', district: 'DKA', total: 3 },
    ];

    const result = mapInteriorSpreadsheet(rows);
    const totalDistricts = result.zones.flatMap((z) => z.districts).length;
    expect(totalDistricts).toBe(0);
  });

  it('skips rows with empty district code', () => {
    const rows = [
      { zone: 'Dry belt', district: '', total: 5 },
      { zone: 'Dry belt', district: '   ', total: 3 },
    ];

    const result = mapInteriorSpreadsheet(rows);
    const dryBelt = result.zones.find((z) => z.name === 'Dry belt')!;
    expect(dryBelt.districts).toHaveLength(0);
  });

  it('missing numeric columns default to 0', () => {
    const rows = [{ zone: 'Dry belt', district: 'DPG' }];

    const result = mapInteriorSpreadsheet(rows);
    const district = result.zones.find((z) => z.name === 'Dry belt')!.districts[0];
    expect(district.avoidableSawlog).toBe(0);
    expect(district.avoidableGrade4).toBe(0);
    expect(district.unavoidableGrade4).toBe(0);
    expect(district.total).toBe(0);
  });

  it('coerces string numbers to numbers', () => {
    const rows = [
      {
        zone: 'Dry belt',
        district: 'DPG',
        avoidableSawlog: '7.5',
        avoidableGradeY4: '1.2',
        unavoidable: '0.3',
        total: '9.0',
      },
    ];

    const result = mapInteriorSpreadsheet(rows);
    const district = result.zones.find((z) => z.name === 'Dry belt')!.districts[0];
    expect(typeof district.avoidableSawlog).toBe('number');
    expect(district.avoidableSawlog).toBe(7.5);
    expect(district.total).toBe(9.0);
  });

  it('mixed valid and invalid rows — only valid rows land in zones', () => {
    const rows = [
      { zone: 'Dry belt', district: 'DPG', total: 5 }, // valid
      { zone: 'Unknown', district: 'DXX', total: 5 }, // bad zone
      { zone: 'Transition zone', district: '', total: 3 }, // empty district
      { zone: 'Wet belt', district: 'DKA', total: 2 }, // valid
    ];

    const result = mapInteriorSpreadsheet(rows);
    const totalDistricts = result.zones.flatMap((z) => z.districts).length;
    expect(totalDistricts).toBe(2);
  });

  it('other zones remain empty when only one zone has rows', () => {
    const rows = [{ zone: 'Dry belt', district: 'DPG', total: 1 }];

    const result = mapInteriorSpreadsheet(rows);
    const transition = result.zones.find((z) => z.name === 'Transition zone')!;
    const wetBelt = result.zones.find((z) => z.name === 'Wet belt')!;
    expect(transition.districts).toHaveLength(0);
    expect(wetBelt.districts).toHaveLength(0);
  });
});
