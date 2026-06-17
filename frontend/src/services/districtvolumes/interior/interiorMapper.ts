import type {
  InteriorDistrictRow,
  InteriorZone,
  InteriorData,
} from '@/services/districtvolumes.types';

export function mapInteriorSpreadsheet(rows: Record<string, unknown>[]): InteriorData {
  const zoneMap = new Map<string, InteriorDistrictRow[]>();

  zoneMap.set('Dry belt', []);
  zoneMap.set('Transition zone', []);
  zoneMap.set('Wet belt', []);

  for (const row of rows) {
    const zoneName = String(row['zone'] ?? '').trim();
    const districtCode = String(row['district'] ?? '').trim();

    if (!zoneMap.has(zoneName) || !districtCode) continue;

    const districtRow: InteriorDistrictRow = {
      code: districtCode,
      avoidableSawlog: Number(row['avoidableSawlog'] ?? 0),
      avoidableGrade4: Number(row['avoidableGrade4'] ?? 0),
      unavoidableGrade4: Number(row['unavoidableGrade4'] ?? 0),
      total: Number(row['total'] ?? 0),
    };

    zoneMap.get(zoneName)?.push(districtRow);
  }

  const zones: InteriorZone[] = Array.from(zoneMap.entries()).map(([name, districts]) => ({
    name: name as 'Dry belt' | 'Transition zone' | 'Wet belt',
    districts,
  }));

  return { type: 'INTERIOR', zones, formulas: {} };
}
