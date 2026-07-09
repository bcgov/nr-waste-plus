import { type FC } from 'react';

import CoastDetailView from './CoastDetailView';
import InteriorDetailView from './InteriorDetailView';

import type { DistrictVolumeDetail } from '@/services/districtvolumes.types';

import { useDistrictOptionsQuery } from '@/config/react-query/hooks';

/**
 * Props for the {@link DistrictVolumeDetailView} component.
 */
interface DistrictVolumeDetailViewProps {
  /** The district volume detail data. */
  readonly data: DistrictVolumeDetail;
}

/**
 * District Volume Detail view wrapper — renders either {@link InteriorDetailView}
 * or {@link CoastDetailView} based on the `area` field in the data.
 *
 * Fetches the full list of district codes/descriptions so each view can
 * look up the human-readable name by district code at render time.
 *
 * @param props - Component props.
 * @param props.data - The district volume detail data.
 * @returns The appropriate detail view for the district area type.
 */
const DistrictVolumeDetailView: FC<DistrictVolumeDetailViewProps> = ({ data }) => {
  const { data: districtOptions = [] } = useDistrictOptionsQuery();

  return data.area === 'INTERIOR' ? (
    <InteriorDetailView data={data} districtOptions={districtOptions} />
  ) : (
    <CoastDetailView data={data} districtOptions={districtOptions} />
  );
};

export default DistrictVolumeDetailView;
