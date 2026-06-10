import type { InteriorDistrictRow, InteriorZone, InteriorData } from '../../districtVolumes.types';

export function mapInteriorSpreadsheet(rows: Record<string, unknown>[]): InteriorData {
  const zoneMap = new Map<string, InteriorDistrictRow[]>();

  // Initialize the mandatory zones
  zoneMap.set('Dry belt', []);
  zoneMap.set('Transition zone', []);
  zoneMap.set('Wet belt', []);

  for (const row of rows) {
    const zoneName = String(row['Benchmark zone'] || '').trim();
    const districtCode = String(row['District'] || '').trim();

    if (!zoneMap.has(zoneName) || !districtCode) {
      continue; // Skip invalid zones or empty rows
    }

    const districtRow: InteriorDistrictRow = {
      code: districtCode,
      avoidableSawlog: Number(row['Avoidable sawlog'] || 0),
      avoidableGrade4: Number(row['Avoidable Grade 4 sawing'] || 0),
      unavoidableGrade4: Number(row['Unavoidable Grade 4 sawing'] || 0),
      total: Number(row['Total'] || 0),
    };

    zoneMap.get(zoneName)?.push(districtRow);
  }

  const zones: InteriorZone[] = Array.from(zoneMap.entries()).map(([name, districts]) => ({
    name: name as 'Dry belt' | 'Transition zone' | 'Wet belt',
    districts,
  }));

  return {
    type: 'INTERIOR',
    zones,
    formulas: {}, // Reserved as per spec
  };
}
