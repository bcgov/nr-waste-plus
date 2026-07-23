import {
  DataTable,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@carbon/react';

import type { SpeciesCompositionRow } from '@/services/speciesComposition.types';
import type { FC } from 'react';

import { SPECIES_COLUMNS, SPECIES_LABELS } from '@/services/speciesComposition.types';

/**
 * Props for the SpeciesCompositionReviewTable component.
 */
interface SpeciesCompositionReviewTableProps {
  /** Parsed species composition rows to display in the review table. */
  readonly 'rows': SpeciesCompositionRow[];
  /** Optional test identifier. */
  readonly 'data-testid'?: string;
}

/**
 * Review table displaying parsed species composition data.
 *
 * Shows districts as rows and 19 species + total as columns.
 * Each cell displays the species proportion value.
 *
 * @returns A Carbon DataTable with district code column.
 */
const SpeciesCompositionReviewTable: FC<SpeciesCompositionReviewTableProps> = ({
  rows,
  'data-testid': testId,
}) => {
  const headers = SPECIES_COLUMNS.map((key) => ({
    key,
    header: SPECIES_LABELS[key],
  }));

  const tableRows = rows.map((row, index) => ({
    id: `row-${index}`,
    district: row.district.code,
    ...Object.fromEntries(SPECIES_COLUMNS.map((key) => [key, row[key]])),
  }));

  return (
    <div className="species-composition-review-table" data-testid={testId}>
      <h3 className="species-composition-review-table__title">Review uploaded data</h3>
      <DataTable rows={tableRows} headers={headers}>
        {({ rows: tableRows, headers, getHeaderProps }) => (
          <Table>
            <TableHead>
              <TableRow>
                <TableHeader>District</TableHeader>
                {headers.map((header) => {
                  const { key: _key, ...headerProps } = getHeaderProps({ header });
                  return (
                    <TableHeader key={header.key} {...headerProps}>
                      {header.header}
                    </TableHeader>
                  );
                })}
              </TableRow>
            </TableHead>
            <TableBody>
              {tableRows.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.cells[0].value}</TableCell>
                  {row.cells.slice(1).map((cell) => (
                    <TableCell key={cell.id}>{cell.value}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataTable>
    </div>
  );
};

export default SpeciesCompositionReviewTable;
