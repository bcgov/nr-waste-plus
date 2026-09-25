import { Add } from '@carbon/icons-react';
import { Button, Column } from '@carbon/react';
import { useNavigate } from '@tanstack/react-router';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';
import FormulaConfigurationListTable from '@/components/waste/Formula/FormulaConfigurationListTable';
import { navigateInTree } from '@/routes/inTreePaths';

import './index.scss';

/** Page shell for the date-effective formula configuration list. */
const FormulaConfigurationListPage: FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Column lg={16} md={8} sm={4} className="formula-set-list-column__header">
        <PageTitle
          title="Formula Configuration"
          subtitle="Manage formula sets with date-effective lifecycle for district average calculations"
          breadCrumbs={[{ name: 'Configuration', path: '/configuration' }]}
        >
          <Button
            kind="primary"
            onClick={() => navigateInTree(navigate, '/configuration/formulas/new')}
            renderIcon={Add}
          >
            Create formula set
          </Button>
        </PageTitle>
      </Column>
      <FormulaConfigurationListTable />
    </>
  );
};

export default FormulaConfigurationListPage;
