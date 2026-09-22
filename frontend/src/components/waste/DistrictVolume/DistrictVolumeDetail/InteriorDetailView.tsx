import { type FC } from 'react';

import DistrictVolumeDetailHeader from './DistrictVolumeDetailHeader';
import DistrictVolumeDetailTabs from './DistrictVolumeDetailTabs';
import { useDistrictCodeColumn } from './useDistrictCodeColumn';

import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { DistrictVolumeDetail, InteriorDistrictRow } from '@/services/districtvolumes.types';
import type { CodeDescriptionDto } from '@/services/search.types';

import PrecisionNumberTag from '@/components/core/Tags/PrecisionNumberTag';

/**
 * Props for the {@link InteriorDetailView} component.
 */
interface InteriorDetailViewProps {
  /** The district volume detail data (must be INTERIOR variant). */
  readonly data: DistrictVolumeDetail;
  /** All district codes/descriptions for looking up district names by code. */
  readonly districtOptions: CodeDescriptionDto[];
}

/**
 * Interior District Volume Detail view — displays header fields and zone tables
 * with tabs for Dry belt, Transition zone, and Wet belt.
 *
 * Uses Carbon's `<Tabs>` component to display each zone as a separate tab panel
 * containing a {@link DistrictZoneSection} table.
 *
 * @param props - Component props.
 * @param props.data - The district volume detail data.
 * @returns The Interior Detail view.
 */
const InteriorDetailView: FC<InteriorDetailViewProps> = ({ data, districtOptions }) => {
  // Narrow the discriminated union to the INTERIOR variant
  if (data.area !== 'INTERIOR') {
    throw new Error('InteriorDetailView requires data with area="INTERIOR"');
  }

  const { tableData, startDate, endDate, tableLevelFactor } = data;
  const zones = tableData.zones;

  /** O(1) code→description render function for the district column. */
  const renderDistrictCode = useDistrictCodeColumn(districtOptions);

  /** Table headers for interior district volume rows. */
  const headers: TableHeaderType<InteriorDistrictRow>[] = [
    {
      key: 'code',
      header: 'District',
      selected: true,
      renderAs: renderDistrictCode,
    },
    {
      key: 'avoidableSawlog',
      header: 'Avoidable sawlog',
      selected: true,
      renderAs: (row) => <PrecisionNumberTag value={row} precision={3} />,
    },
    {
      key: 'avoidableGrade4',
      header: 'Avoidable Grade 4',
      selected: true,
      renderAs: (row) => <PrecisionNumberTag value={row} precision={3} />,
    },
    {
      key: 'unavoidableGrade4',
      header: 'Unavoidable Grade 4',
      selected: true,
      renderAs: (row) => <PrecisionNumberTag value={row} precision={3} />,
    },
    {
      key: 'total',
      header: 'Total',
      selected: true,
      renderAs: (row) => <PrecisionNumberTag value={row} precision={3} />,
    },
  ];

  return (
    <>
      <DistrictVolumeDetailHeader
        startDate={startDate}
        endDate={endDate}
        tableLevelFactor={tableLevelFactor}
      />
      <DistrictVolumeDetailTabs ariaLabel="District zones" items={zones} headers={headers} />
    </>
  );
};

export default InteriorDetailView;
