import type { CoastDistrictRow, CoastSection, CoastData } from '@/services/districtvolumes.types';

function extractDistrictCode(raw: string): string {
  const trimmed = raw.trim();
  const dashIdx = trimmed.indexOf(' - ');
  return dashIdx > 0 ? trimmed.slice(0, dashIdx) : trimmed;
}

export function mapCoastSpreadsheet(rows: Record<string, unknown>[]): CoastData {
  const sectionMap = new Map<string, CoastDistrictRow[]>();

  sectionMap.set('Mature', []);
  sectionMap.set('Immature', []);

  for (const row of rows) {
    const sectionName = String(row['section'] ?? '').trim();
    const districtCode = extractDistrictCode(String(row['district'] ?? ''));

    if (!sectionMap.has(sectionName) || !districtCode) continue;

    const districtRow: CoastDistrictRow = {
      code: districtCode,
      avoidableSawlog: Number(row['avoidableSawlog'] ?? 0),
      avoidableHembalGradeU: Number(row['avoidable25'] ?? 0),
      avoidableGradeY: Number(row['avoidableGradeY'] ?? 0),
      unavoidable: Number(row['unavoidable'] ?? 0),
      total: Number(row['total'] ?? 0),
    };

    sectionMap.get(sectionName)?.push(districtRow);
  }

  const sections: CoastSection[] = Array.from(sectionMap.entries()).map(([name, districts]) => ({
    name: name as 'Mature' | 'Immature',
    districts,
  }));

  return { type: 'COASTAL', sections, formulas: {} };
}
