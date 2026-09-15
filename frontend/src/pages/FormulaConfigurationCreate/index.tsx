import { Column } from '@carbon/react';

import type { FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import FormulaConfigurationCreateForm from '@/components/waste/FormulaConfigurationCreateForm';

import './index.scss';

const FormulaConfigurationCreatePage: FC = () => {
  return (
    <>
      <Column lg={16} md={8} sm={4} className="formula-set-create-column__banner">
        <PageTitle
          title="Create new formula set"
          subtitle="Define a new formula set for calculating waste volumes"
          breadCrumbs={[
            { name: 'Configuration', path: '/configuration' },
            { name: 'Formula sets', path: '/configuration/formulas' },
          ]}
        />
      </Column>

      <Column
        lg={16}
        md={8}
        sm={4}
        className="formula-set-create-column__notification"
        data-testid="formula-set-create-column__notification"
      >
        <PageNotification eventTarget="upload-table" />
      </Column>

      <FormulaConfigurationCreateForm />
    </>
  );
};

export default FormulaConfigurationCreatePage;
