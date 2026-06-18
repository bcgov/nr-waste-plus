import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@carbon/react';
import { type FC } from 'react';

import type { InteriorData, CoastData, TableData } from '@/services/districtvolumes.types';

const interiorHeaders = [
  { key: 'code', header: 'District' },
  { key: 'avoidableSawlog', header: 'Avoidable Sawlog (m³/ha)' },
  { key: 'avoidableGrade4', header: 'Avoidable Grade Y/4 (m³/ha)' },
  { key: 'unavoidableGrade4', header: 'Unavoidable (m³/ha)' },
  { key: 'total', header: 'Total (m³/ha)' },
];

const coastHeaders = [
  { key: 'code', header: 'District' },
  { key: 'avoidableSawlog', header: 'Avoidable Sawlog (m³/ha)' },
  { key: 'avoidableHembalGradeU', header: 'Avoidable 0.25 (m³/ha)' },
  { key: 'avoidableGradeY', header: 'Avoidable Grade Y (m³/ha)' },
  { key: 'unavoidable', header: 'Unavoidable (m³/ha)' },
  { key: 'total', header: 'Total (m³/ha)' },
];

function fmt(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : '—';
}

interface DistrictTableProps {
  title: string;
  rows: Record<string, unknown>[];
  headers: { key: string; header: string }[];
}

const DistrictTable: FC<DistrictTableProps> = ({ title, rows, headers }) => (
  <section style={{ marginBlock: '2rem' }}>
    <h3 style={{ marginBlockEnd: '0.5rem' }}>{title}</h3>
    <Table size="lg" useZebraStyles>
      <TableHead>
        <TableRow>
          {headers.map((h) => (
            <TableHeader key={h.key} id={h.key}>
              {h.header}
            </TableHeader>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={headers.length}>No data</TableCell>
          </TableRow>
        ) : (
          rows.map((row, i) => (
            <TableRow key={String(row.code) + i}>
              {headers.map((h) => (
                <TableCell key={h.key}>
                  {h.key === 'code' ? String(row[h.key] ?? '') : fmt(Number(row[h.key]))}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  </section>
);

const InteriorDisplay: FC<{ data: InteriorData }> = ({ data }) => (
  <>
    {data.zones.map((zone) => (
      <DistrictTable
        key={zone.name}
        title={zone.name}
        rows={zone.districts}
        headers={interiorHeaders}
      />
    ))}
  </>
);

const CoastDisplay: FC<{ data: CoastData }> = ({ data }) => (
  <>
    {data.sections.map((section) => (
      <DistrictTable
        key={section.name}
        title={section.name}
        rows={section.districts}
        headers={coastHeaders}
      />
    ))}
  </>
);

interface Props {
  data: TableData;
}

const DistrictVolumeTable: FC<Props> = ({ data }) => {
  if (data.type === 'INTERIOR') return <InteriorDisplay data={data} />;
  return <CoastDisplay data={data} />;
};

export default DistrictVolumeTable;
