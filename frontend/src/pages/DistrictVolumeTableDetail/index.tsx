import { Column } from '@carbon/react';
import { useParams } from '@tanstack/react-router';
import { type FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import DistrictVolumeDetailView from '@/components/waste/DistrictVolumeDetail';
import DistrictVolumeDetailSkeleton from '@/components/waste/DistrictVolumeDetail/DistrictVolumeDetailSkeleton';
import { useDistrictVolumeTableDetailQuery } from '@/config/react-query/hooks';

import './index.scss';

/**
 * District Volume Table Detail page — displays detailed information for a specific
 * district volume configuration, including zone/section tables with tabs.
 *
 * Fetches the detail data via {@link useDistrictVolumeTableDetailQuery} using the
 * `id` route param and delegates to {@link DistrictVolumeDetailView} which renders
 * the appropriate (Interior/Coast) detail view based on the `area` field.
 *
 * On loading, displays a skeleton. On error or missing data, displays an error
 * page with inline notifications via {@link PageNotification}.
 *
 * @returns The District Volume Table Detail page.
 */
const DistrictVolumeTableDetailPage: FC = () => {
  const params = useParams({ strict: false });
  const id = Number(params.id);

  const { data, isLoading, isError } = useDistrictVolumeTableDetailQuery(id, {
    notificationTarget: 'district-volume-detail',
  });

  if (isLoading) {
    return <DistrictVolumeDetailSkeleton />;
  }

  const normalizeText = (text: string): string => {
    return text
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  if (isError || !data) {
    return (
      <>
        <Column lg={16} md={8} sm={4} className="district-volume-detail-column__banner">
          <PageTitle
            title="District Volume Table not found"
            subtitle="Required data is missing or an error occurred while loading."
          />
        </Column>
        <Column lg={16} md={8} sm={4} className="district-volume-detail-column__notification">
          <PageNotification eventTarget="district-volume-detail" />
        </Column>
      </>
    );
  }

  return (
    <>
      <Column lg={16} md={8} sm={4} className="district-volume-detail-column__banner">
        <PageTitle
          title={`Volumes table: ${normalizeText(data.area)}`}
          subtitle="View tables used to calculate volumes when district average waste assessment is used"
        />
      </Column>
      <Column lg={16} md={8} sm={4} className="district-volume-detail-column__notification">
        <PageNotification eventTarget="district-volume-detail" />
      </Column>
      <DistrictVolumeDetailView data={data} />
    </>
  );
};

export default DistrictVolumeTableDetailPage;
