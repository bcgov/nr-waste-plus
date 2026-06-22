import { Add } from '@carbon/icons-react';
import { Button, Column } from '@carbon/react';
import { useNavigate } from '@tanstack/react-router';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';
import DistrictVolumeListTable from '@/components/waste/DistrictVolumeListTable';
import { navigateInTree } from '@/routes/inTreePaths';

import './index.scss';

/**
 * Page shell for the district average waste volume list.
 *
 * Renders the page title, breadcrumb, upload button, and delegates
 * all table logic to the {@link DistrictVolumeListTable} component.
 *
 * @returns The district volume list page.
 */
const ConfigurationDistrictVolumeListPage: FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Column lg={16} md={8} sm={4} className="configuration-column__header">
        <PageTitle
          title="District average waste volumes"
          subtitle="View tables used to calculate volumes when district average waste assessment is used"
          breadCrumbs={[{ name: 'Configuration', path: '/configuration' }]}
        >
          <Button
            kind="primary"
            onClick={() => navigateInTree(navigate, '/configuration/upload-district-volume')}
          >
            Upload new volumes table <Add />
          </Button>
        </PageTitle>
      </Column>
      <DistrictVolumeListTable />
    </>
  );
};

export default ConfigurationDistrictVolumeListPage;
