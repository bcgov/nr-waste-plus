import { ArrowLeft } from '@carbon/icons-react';
import { Button, Column } from '@carbon/react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { type FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import FormulaConfigurationDetailSkeleton from '@/components/waste/FormulaConfigurationDetail/FormulaConfigurationDetailSkeleton';
import FormulaConfigurationDetailView from '@/components/waste/FormulaConfigurationDetail/FormulaConfigurationDetailView';
import { useFormulaSetDetail } from '@/hooks/useFormulaConfiguration';
import { navigateInTree } from '@/routes/inTreePaths';

import './index.scss';

const FormulaConfigurationDetailPage: FC = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const id = Number(params.id);

  const { data, isLoading, isError } = useFormulaSetDetail(id, {
    notificationTarget: 'formula-set-detail',
  });

  if (isLoading) {
    return <FormulaConfigurationDetailSkeleton />;
  }

  if (isError || !data) {
    return (
      <>
        <Column lg={16} md={8} sm={4} className="formula-set-detail-column__banner">
          <PageTitle
            title="Formula set not found"
            subtitle="Required data is missing or an error occurred while loading."
          />
        </Column>
        <Column lg={16} md={8} sm={4} className="formula-set-detail-column__notification">
          <PageNotification eventTarget="formula-set-detail" />
        </Column>
        <Column
          lg={16}
          md={8}
          sm={4}
          className="formula-set-detail-column__actions"
          data-testid="formula-set-detail-actions"
        >
          <Button
            kind="secondary"
            onClick={() => navigateInTree(navigate, '/configuration/formulas')}
            renderIcon={ArrowLeft}
          >
            Back
          </Button>
        </Column>
      </>
    );
  }

  const normalizeText = (text: string): string => {
    return text
      .trim()
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <>
      <Column lg={16} md={8} sm={4} className="formula-set-detail-column__banner">
        <PageTitle
          title={`Formula set: ${normalizeText(data.area)}`}
          subtitle="View formulas used to calculate reporting unit and block values"
          breadCrumbs={[
            { name: 'Configuration', path: '/configuration' },
            { name: 'Formula sets', path: '/configuration/formulas' },
          ]}
        />
      </Column>
      <Column lg={16} md={8} sm={4} className="formula-set-detail-column__notification">
        <PageNotification eventTarget="formula-set-detail" />
      </Column>
      <FormulaConfigurationDetailView data={data} />
      <Column
        lg={16}
        md={8}
        sm={4}
        className="formula-set-detail-column__actions"
        data-testid="formula-set-detail-actions"
      >
        <Button
          kind="secondary"
          onClick={() => navigateInTree(navigate, '/configuration/formulas')}
          renderIcon={ArrowLeft}
        >
          Back
        </Button>
      </Column>
    </>
  );
};

export default FormulaConfigurationDetailPage;
