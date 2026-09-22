import { Column, Tab, TabList, TabPanel, TabPanels, Tabs } from '@carbon/react';

import type { TableHeaderType } from '@/components/Form/TableResource/types';
import type { CoastDistrictRow, InteriorDistrictRow } from '@/services/districtvolumes.types';

import DistrictZoneSection from '@/components/waste/DistrictZoneSection';

/**
 * A generic section item for the tabs.
 */
export interface DistrictVolumeSectionItem<TRow extends InteriorDistrictRow | CoastDistrictRow> {
  /** The name of the section/zone. */
  readonly name: string;
  /** The rows of data for the section/zone. */
  readonly districts: TRow[];
}

/**
 * Props for the {@link DistrictVolumeDetailTabs} component.
 */
interface DistrictVolumeDetailTabsProps<TRow extends InteriorDistrictRow | CoastDistrictRow> {
  /** The aria-label for the tab list. */
  readonly ariaLabel: string;
  /** The sections or zones to display as tabs. */
  readonly items: DistrictVolumeSectionItem<TRow>[];
  /** The table headers for the rows. */
  readonly headers: TableHeaderType<TRow>[];
}

/**
 * Renders the tabs and tables for a District Volume Detail view.
 *
 * @param props - Component props.
 * @returns The tabs component.
 */
const DistrictVolumeDetailTabs = <TRow extends InteriorDistrictRow | CoastDistrictRow>({
  ariaLabel,
  items,
  headers,
}: DistrictVolumeDetailTabsProps<TRow>): React.ReactElement => {
  return (
    <Column lg={16} md={8} sm={4} className="district-volume-detail__zones">
      <Tabs defaultSelectedIndex={0}>
        <TabList aria-label={ariaLabel} contained size="lg">
          {items.map((item) => (
            <Tab key={item.name}>{item.name}</Tab>
          ))}
        </TabList>
        <TabPanels>
          {items.map((item) => (
            <TabPanel key={item.name}>
              <DistrictZoneSection zoneName={item.name} rows={item.districts} headers={headers} />
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>
    </Column>
  );
};

export default DistrictVolumeDetailTabs;
