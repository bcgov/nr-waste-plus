import { Column } from '@carbon/react';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';
import { type FC } from 'react';

import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { CoastDistrictRow, DistrictVolumeDetail } from '@/services/districtvolumes.types';

import DateTag from '@/components/core/Tags/DateTag';
import PrecisionNumberTag from '@/components/core/Tags/PrecisionNumberTag';
import ReadonlyInput from '@/components/Form/ReadonlyInput';
import DistrictZoneSection from '@/components/waste/DistrictZoneSection';

/**
 * Props for the {@link CoastDetailView} component.
 */
interface CoastDetailViewProps {
  /** The district volume detail data (must be COASTAL variant). */
  readonly data: DistrictVolumeDetail;
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
const CoastDetailView: FC<CoastDetailViewProps> = ({ data }) => {
  // Narrow the discriminated union to the COASTAL variant
  if (data.area !== 'COASTAL') {
    throw new Error('CoastDetailView requires data with area="COASTAL"');
  }

  const { tableData, startDate, endDate, tableLevelFactor, heliMultiplier } = data;
  const sections = tableData.sections;

  const headers: TableHeaderType<CoastDistrictRow>[] = [
    { key: 'code', header: 'Code', selected: true },
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
      <Column lg={4} md={4} sm={4} className="district-volume-detail__start-date">
        <ReadonlyInput label="Start date">
          {startDate && <DateTag date={startDate} format="MMMM dd, yyyy" />}
        </ReadonlyInput>
      </Column>
      <Column lg={12} md={4} sm={4} className="district-volume-detail__end-date">
        <ReadonlyInput label="End date">
          {endDate && <DateTag date={endDate} format="MMMM dd, yyyy" />}
        </ReadonlyInput>
      </Column>
      <Column lg={4} md={4} sm={4} className="district-volume-detail__table-level-factor">
        <ReadonlyInput label="Dispersed retention reduction factor">
          <PrecisionNumberTag value={tableLevelFactor} precision={3} />
        </ReadonlyInput>
      </Column>
      <Column lg={12} md={4} sm={4} className="district-volume-detail__heli-multiplier">
        <ReadonlyInput label="Heli multiplier">
          <PrecisionNumberTag value={heliMultiplier} precision={3} />
        </ReadonlyInput>
      </Column>

      <Column lg={16} md={4} sm={4} className="district-volume-detail__zones">
        <Tabs defaultSelectedIndex={0}>
          <TabList aria-label="Coast sections" contained size="lg">
            {sections.map((section) => (
              <Tab key={section.name}>{section.name}</Tab>
            ))}
          </TabList>
          <TabPanels>
            {sections.map((section) => (
              <TabPanel key={section.name}>
                <DistrictZoneSection
                  zoneName={section.name}
                  rows={section.districts}
                  headers={headers}
                />
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </Column>
    </>
  );
};

export default CoastDetailView;
