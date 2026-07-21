import { Add } from '@carbon/icons-react';
import { Button, Column } from '@carbon/react';
import { useNavigate } from '@tanstack/react-router';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';
import SpeciesCompositionListTable from '@/components/waste/SpeciesCompositionListTable';
import { navigateInTree } from '@/routes/inTreePaths';

import './index.scss';

/**
 * Page shell for the district level species composition list.
 *
 * Renders the page title, breadcrumb, upload button, and delegates
 * all table logic to the {@link SpeciesCompositionListTable} component.
 *
 * @returns The species composition list page.
 */
const SpeciesCompositionListPage: FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Column lg={16} md={8} sm={4} className="species-composition-column__header">
        <PageTitle
          title="District level species composition"
          subtitle="View tables used to calculate volumes when district average waste assessment is used"
          breadCrumbs={[{ name: 'Configuration', path: '/configuration' }]}
        >
          <Button
            kind="primary"
            onClick={() => navigateInTree(navigate, '/configuration/species-composition/upload')}
            renderIcon={Add}
          >
            Upload Spreadsheet
          </Button>
        </PageTitle>
      </Column>
      <SpeciesCompositionListTable />
    </>
  );
};

export default SpeciesCompositionListPage;
