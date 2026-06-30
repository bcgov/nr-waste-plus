import { Column } from '@carbon/react';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { type FC } from 'react';

import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { DistrictVolumeDetail, InteriorDistrictRow } from '@/services/districtvolumes.types';

import DateTag from '@/components/core/Tags/DateTag';
import PrecisionNumberTag from '@/components/core/Tags/PrecisionNumberTag';
import ReadonlyInput from '@/components/Form/ReadonlyInput';
import DistrictZoneSection from '@/components/waste/DistrictZoneSection';

/**
 * Props for the {@link InteriorDetailView} component.
 */
interface InteriorDetailViewProps {
  /** The district volume detail data (must be INTERIOR variant). */
  readonly data: DistrictVolumeDetail;
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
const InteriorDetailView: FC<InteriorDetailViewProps> = ({ data }) => {
  // Narrow the discriminated union to the INTERIOR variant
  if (data.area !== 'INTERIOR') {
    throw new Error('InteriorDetailView requires data with area="INTERIOR"');
  }

  const { tableData, startDate, endDate, tableLevelFactor } = data;
  const zones = tableData.zones;

  /** Table headers for interior district volume rows. */
  const headers: TableHeaderType<InteriorDistrictRow>[] = [
    { key: 'code', header: 'Code', selected: true },
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
      <Column lg={4} md={4} sm={4} className="district-volume-detail__start-date">
        <ReadonlyInput label="Start date">
          {startDate && <DateTag date={startDate} format="MMMM dd, yyyy" />}
        </ReadonlyInput>
      </Column>
      <Column lg={12} md={4} sm={4} className="district-volume-detail__end-date">
        {endDate && <DateTag date={endDate} format="MMMM dd, yyyy" />}
      </Column>
      <Column lg={4} md={4} sm={4} className="district-volume-detail__table-level-factor">
        <ReadonlyInput label="Dispersed retention reduction factor">
          <PrecisionNumberTag value={tableLevelFactor} precision={3} />
        </ReadonlyInput>
      </Column>
      <Column lg={12} md={4} sm={4} className="district-volume-detail__heli-multiplier">
        <ReadonlyInput label="Heli multiplier">TBD</ReadonlyInput>
      </Column>

      <Column lg={16} md={8} sm={4} className="district-volume-detail__zones">
        <Tabs defaultSelectedIndex={0}>
          <TabList aria-label="District zones" contained size="lg">
            {zones.map((zone) => (
              <Tab key={zone.name}>{zone.name}</Tab>
            ))}
          </TabList>
          <TabPanels>
            {zones.map((zone) => (
              <TabPanel key={zone.name}>
                <DistrictZoneSection zoneName={zone.name} rows={zone.districts} headers={headers} />
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </Column>
    </>
  );
};

export default InteriorDetailView;
