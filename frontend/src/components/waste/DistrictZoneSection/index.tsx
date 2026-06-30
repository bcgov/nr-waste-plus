import type { PageableResponse, TableHeaderType } from '@/components/Form/TableResource/types';
import type { CoastDistrictRow, InteriorDistrictRow } from '@/services/districtvolumes.types';

import TableResource from '@/components/Form/TableResource';

/**
 * Props for the {@link DistrictZoneSection} component.
 */
interface DistrictZoneSectionProps<T extends InteriorDistrictRow | CoastDistrictRow> {
  /** The name of the zone (e.g. "Dry belt"). */
  readonly zoneName: string;
  /** District rows to display in the table. */
  readonly rows: T[];
  /** Table headers for the district rows. */
  readonly headers: TableHeaderType<T>[];
  /** Whether the data is still loading. */
  readonly loading?: boolean;
}

/**
 * District Zone Section — displays a table of district-level volume data for a single zone.
 *
 * Wraps a {@link TableResource} with static (non-paginated) data for the given zone's
 * district rows. The table is read-only with no sorting or pagination controls.
 *
 * @param props - Component props.
 * @param props.zoneName - The zone name used as the table ID.
 * @param props.rows - The district rows for this zone.
 * @param props.loading - Whether to show the loading skeleton.
 * @returns The zone section with a district volume table.
 */
const DistrictZoneSection = <T extends InteriorDistrictRow | CoastDistrictRow>({
  zoneName,
  rows,
  headers,
  loading = false,
}: DistrictZoneSectionProps<T>) => {
  const content: PageableResponse<T> = {
    content: rows.map((row) => ({ ...row, id: row.code })),
    page: {
      size: rows.length,
      number: 0,
      totalElements: rows.length,
      totalPages: 1,
    },
  };

  return (
    <TableResource
      id={`district-zone-${zoneName}`}
      headers={headers}
      content={content}
      loading={loading}
      error={false}
    />
  );
};

export default DistrictZoneSection;
