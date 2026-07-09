import { useMemo, type FC } from 'react';

import DistrictVolumeDetailHeader from './DistrictVolumeDetailHeader';
import DistrictVolumeDetailTabs from './DistrictVolumeDetailTabs';

import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { CoastDistrictRow, DistrictVolumeDetail } from '@/services/districtvolumes.types';
import type { CodeDescriptionDto } from '@/services/search.types';

import CodeDescriptionTag from '@/components/waste/CodeDescriptionTag';
import PrecisionNumberTag from '@/components/core/Tags/PrecisionNumberTag';

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

  /** Pre-built O(1) code→description lookup map. */
  const districtMap = useMemo(
    () => new Map(districtOptions.map((d) => [d.code, d.description])),
    [districtOptions],
  );

  const headers: TableHeaderType<CoastDistrictRow>[] = [
    {
      key: 'code',
      header: 'District',
      selected: true,
      renderAs: (value) => {
        const description = districtMap.get(value as string) ?? (value as string);
        return <CodeDescriptionTag value={{ code: value as string, description }} />;
      },
    },
    {
      key: 'avoidableSawlog',
      header: 'Avoidable sawlog',
      selected: true,
      renderAs: (row) => <PrecisionNumberTag value={row} precision={3} />,
    },
    {
      key: 'avoidableHembalGradeU',
      header: 'Avoidable Hembal Grade U',
      selected: true,
      renderAs: (row) => <PrecisionNumberTag value={row} precision={3} />,
    },
    {
      key: 'avoidableGradeY',
      header: 'Avoidable Grade Y',
      selected: true,
      renderAs: (row) => <PrecisionNumberTag value={row} precision={3} />,
    },
    {
      key: 'unavoidable',
      header: 'Unavoidable',
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
        heliMultiplier={heliMultiplier}
      />
      <DistrictVolumeDetailTabs ariaLabel="Coast sections" items={sections} headers={headers} />
    </>
  );
};

export default CoastDetailView;
