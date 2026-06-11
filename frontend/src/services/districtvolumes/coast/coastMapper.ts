import type { CoastDistrictRow, CoastSection, CoastData } from '@/services/districtvolumes.types';

export function mapCoastSpreadsheet(rows: Record<string, unknown>[]): CoastData {
  const sectionMap = new Map<string, CoastDistrictRow[]>();

  // Initialize mandatory sections
  sectionMap.set('Mature', []);
  sectionMap.set('Immature', []);

  for (const row of rows) {
    const sectionName = String(row['Section'] || '').trim();
    const districtCode = String(row['District'] || '').trim();

    if (!sectionMap.has(sectionName) || !districtCode) {
      continue;
    }

    const districtRow: CoastDistrictRow = {
      code: districtCode,
      avoidableSawlog: Number(row['Avoidable sawlog'] || 0),
      avoidableHembalGradeU: Number(row['Avoidable Hembal Grade U'] || 0),
      avoidableGradeY: Number(row['Avoidable Grade Y'] || 0),
      unavoidable: Number(row['Unavoidable'] || 0),
      total: Number(row['Total'] || 0),
    };

    sectionMap.get(sectionName)?.push(districtRow);
  }

  const sections: CoastSection[] = Array.from(sectionMap.entries()).map(([name, districts]) => ({
    name: name as 'Mature' | 'Immature',
    districts,
  }));

  return {
    type: 'COASTAL',
    sections,
    formulas: {},
  };
}
