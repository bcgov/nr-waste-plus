import { type FC } from 'react';

import DistrictVolumeDetailHeader from './DistrictVolumeDetailHeader.tsx';
import DistrictVolumeDetailTabs from './DistrictVolumeDetailTabs.tsx';
import { buildDistrictVolumeDetailHeaders } from './districtVolumeDetailHeaders.tsx';
import { useDistrictCodeColumn } from './useDistrictCodeColumn.tsx';

import type { CoastDistrictRow, DistrictVolumeDetail } from '@/services/districtvolumes.types.ts';
import type { CodeDescriptionDto } from '@/services/search.types.ts';

/**
 * Props for the {@link CoastDetailView} component.
 */
interface CoastDetailViewProps {
  /** The district volume detail data (must be COASTAL variant). */
  readonly data: DistrictVolumeDetail;
  /** All district codes/descriptions for looking up district names by code. */
  readonly districtOptions: CodeDescriptionDto[];
}

/**
 * Coast District Volume Detail view — displays header fields and section tables
 * with tabs for Mature and Immature sections.
 *
 * Uses Carbon's `<Tabs>` component to display each section as a separate tab panel.
 *
 * @param props - Component props.
 * @param props.data - The district volume detail data.
 * @returns The Coast Detail view.
 */
const CoastDetailView: FC<CoastDetailViewProps> = ({ data, districtOptions }) => {
  // Narrow the discriminated union to the COASTAL variant
  if (data.area !== 'COASTAL') {
    throw new Error('CoastDetailView requires data with area="COASTAL"');
  }

  const { tableData, startDate, endDate, tableLevelFactor, heliMultiplier } = data;
  const sections = tableData.sections;

  /** O(1) code→description render function for the district column. */
  const renderDistrictCode = useDistrictCodeColumn(districtOptions);

  const headers = buildDistrictVolumeDetailHeaders<CoastDistrictRow>(renderDistrictCode, [
    { key: 'avoidableSawlog', header: 'Avoidable sawlog' },
    { key: 'avoidableHembalGradeU', header: 'Avoidable Hembal Grade U' },
    { key: 'avoidableGradeY', header: 'Avoidable Grade Y' },
    { key: 'unavoidable', header: 'Unavoidable' },
    { key: 'total', header: 'Total' },
  ]);

  return (
    <>
      <DistrictVolumeDetailHeader
        startDate={startDate}
        endDate={endDate}
        tableLevelFactor={tableLevelFactor}
        heliMultiplier={heliMultiplier}
      />
      <DistrictVolumeDetailTabs ariaLabel="Coast sections" items={sections} headers={headers} />
    </>
  );
};

export default CoastDetailView;
