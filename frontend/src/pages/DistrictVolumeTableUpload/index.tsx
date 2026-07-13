import { Column } from '@carbon/react';

import type { FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import DistrictVolumeTableUpload from '@/components/waste/DistrictVolumeUpload';

import './index.scss';

/**
 * Page component for uploading a new district volume table.
 *
 * This page allows administrators to upload spreadsheet files (.xlsx) containing
 * waste volume data for either Interior or Coastal regions. The uploaded data is used
 * to calculate waste volumes when district average waste assessment is applied.
 *
 * The page layout includes:
 * - A banner section with the page title and description
 * - A notification column for status messages and errors
 * - The main DistrictVolumeTableUpload form component
 *
 * Access Control:
 * This page is protected and requires the ADMIN role with client access to view.
 * Users without the appropriate role will be redirected to the unauthorized page.
 *
 * @example
 * // The page is rendered as part of the route tree
 * <Layout>
 *   <DistrictVolumeTableUploadPage />
 * </Layout>
 *
 * @see {@link DistrictVolumeTableUpload} for the form component details
 *
 * @protected Requires ADMIN role with client access
 * @route /configuration/district-volume-tables/upload
 */
const DistrictVolumeTableUploadPage: FC = () => {
  return (
    <>
      <Column lg={16} md={8} sm={4} className="create-ru-column__banner">
        <PageTitle
          title="Upload new volumes table"
          subtitle="Load .xlsx file to calculate waste volumes when district averages waste assessment is used"
        />
      </Column>

      <Column lg={16} md={8} sm={4} className="create-ru-column__notification">
        <PageNotification eventTarget="district-volume-tables-upload" />
      </Column>

      <DistrictVolumeTableUpload />
    </>
  );
};

export default DistrictVolumeTableUploadPage;
