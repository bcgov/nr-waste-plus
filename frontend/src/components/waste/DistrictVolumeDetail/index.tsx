import { type FC } from 'react';

import CoastDetailView from './CoastDetailView';
import InteriorDetailView from './InteriorDetailView';

import type { DistrictVolumeDetail } from '@/services/districtvolumes.types';

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
 * @param props - Component props.
 * @param props.data - The district volume detail data.
 * @returns The appropriate detail view for the district area type.
 */
const DistrictVolumeDetailView: FC<DistrictVolumeDetailViewProps> = ({ data }) => {
  return data.area === 'INTERIOR' ? (
    <InteriorDetailView data={data} />
  ) : (
    <CoastDetailView data={data} />
  );
};

export default DistrictVolumeDetailView;
