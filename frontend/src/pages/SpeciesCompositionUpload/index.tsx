import { Column } from '@carbon/react';

import type { FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';

import './index.scss';

/**
 * Page shell for uploading a new species composition table.
 *
 * Minimal stub — full implementation is tracked in #1058.
 * Renders the page title and notification area. The upload form,
 * file parsing, and validation logic will be added as a follow-up.
 *
 * @returns The species composition upload page.
 */
const SpeciesCompositionUploadPage: FC = () => {
  return (
    <>
      <Column lg={16} md={8} sm={4} className="species-composition-upload-column__banner">
        <PageTitle
          title="Upload new species composition table"
          subtitle="Load .xlsx file containing species composition data"
          breadCrumbs={[{ name: 'Configuration', path: '/configuration' }]}
        />
      </Column>

      <Column lg={16} md={8} sm={4} className="species-composition-upload-column__notification">
        <PageNotification eventTarget="species-composition-upload" />
      </Column>

      {/* Upload form — populated in #1058 */}
    </>
  );
};

export default SpeciesCompositionUploadPage;
