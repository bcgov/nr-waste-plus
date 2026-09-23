import { type FC } from 'react';

import DistrictVolumeDetailHeader from './DistrictVolumeDetailHeader.tsx';
import DistrictVolumeDetailTabs from './DistrictVolumeDetailTabs.tsx';
import { buildDistrictVolumeDetailHeaders } from './districtVolumeDetailHeaders.tsx';
import { useDistrictCodeColumn } from './useDistrictCodeColumn.tsx';

import type {
  DistrictVolumeDetail,
  InteriorDistrictRow,
} from '@/services/districtvolumes.types.ts';
import type { CodeDescriptionDto } from '@/services/search.types.ts';

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

  const headers = buildDistrictVolumeDetailHeaders<InteriorDistrictRow>(renderDistrictCode, [
    { key: 'avoidableSawlog', header: 'Avoidable sawlog' },
    { key: 'avoidableGrade4', header: 'Avoidable Grade 4' },
    { key: 'unavoidableGrade4', header: 'Unavoidable Grade 4' },
    { key: 'total', header: 'Total' },
  ]);

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
