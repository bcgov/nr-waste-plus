import { Column } from '@carbon/react';

import type { FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import SpeciesCompositionUpload from '@/components/waste/SpeciesCompositionUpload';

import './index.scss';

/**
 * Page shell for uploading a new species composition table.
 *
 * Renders the page title, notification area, and the upload form component.
 * The form handles file upload, parsing, validation, and submission.
 *
 * @returns The species composition upload page.
 */
const SpeciesCompositionUploadPage: FC = () => {
  return (
    <>
      <Column lg={16} md={8} sm={4} className="species-composition-upload-column__banner">
        <PageTitle
          title="Upload new species composition table"
          subtitle="Load .xls or .xlsx file to calculate volumes by species when HBS mark monthly billing history report is not available"
          breadCrumbs={[{ name: 'Configuration', path: '/configuration' }]}
        />
      </Column>

      <Column lg={16} md={8} sm={4} className="species-composition-upload-column__notification">
        <PageNotification eventTarget="species-composition-upload" />
      </Column>

      <SpeciesCompositionUpload />
    </>
  );
};

export default SpeciesCompositionUploadPage;
