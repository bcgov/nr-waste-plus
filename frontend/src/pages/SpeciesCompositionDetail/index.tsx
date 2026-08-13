import { ArrowLeft } from '@carbon/icons-react';
import { Button, Column } from '@carbon/react';
import { useNavigate, useParams } from '@tanstack/react-router';
import { type FC } from 'react';

import PageNotification from '@/components/core/PageNotification';
import PageTitle from '@/components/core/PageTitle';
import SpeciesCompositionDetailView from '@/components/waste/SpeciesCompositionDetailView';
import SpeciesCompositionDetailSkeleton from '@/components/waste/SpeciesCompositionDetailView/SpeciesCompositionDetailSkeleton';
import { useSpeciesCompositionDetailQuery } from '@/config/react-query/hooks';
import { navigateInTree } from '@/routes/inTreePaths';

import './index.scss';

/**
 * Species Composition Detail page — displays detailed information for a specific
 * species composition configuration.
 *
 * Fetches the detail data via {@link useSpeciesCompositionDetailQuery} using the
 * `id` route param and delegates to {@link SpeciesCompositionDetailView} which
 * renders the metadata header and a district × species composition matrix table.
 *
 * On loading, displays a skeleton. On error or missing data, displays an error
 * page with inline notifications via {@link PageNotification}.
 *
 * @returns The Species Composition Detail page.
 */
const SpeciesCompositionDetailPage: FC = () => {
  const navigate = useNavigate();
  const params = useParams({ strict: false });
  const id = Number(params.id);

  const { data, isLoading, isError } = useSpeciesCompositionDetailQuery(id, {
    notificationTarget: 'species-composition-detail',
  });

  if (isLoading) {
    return (
      <Column lg={16} md={8} sm={4} className="species-composition-detail-column__banner">
        <SpeciesCompositionDetailSkeleton />
      </Column>
    );
  }

  if (isError || !data) {
    return (
      <>
        <Column lg={16} md={8} sm={4} className="species-composition-detail-column__banner">
          <PageTitle
            title={isError || !data ? 'Species composition not found' : 'Species composition table'}
            subtitle={isError || !data ? undefined : 'View species composition table details'}
            breadCrumbs={[
              { name: 'Configuration', path: '/configuration' },
              { name: 'Species composition', path: '/configuration/species-composition' },
            ]}
          />
        </Column>
        <Column lg={16} md={8} sm={4} className="species-composition-detail-column__notification">
          <PageNotification eventTarget="species-composition-detail" />
        </Column>
        <Column
          lg={16}
          md={8}
          sm={4}
          className="species-composition-detail-column__actions"
          data-testid="species-composition-detail-actions"
        >
          <Button
            kind="secondary"
            onClick={() => navigateInTree(navigate, '/configuration/species-composition')}
            renderIcon={ArrowLeft}
          >
            Back
          </Button>
        </Column>
      </>
    );
  }

  return (
    <>
      <Column lg={16} md={8} sm={4} className="species-composition-detail-column__banner">
        <PageTitle
          title="Species composition table"
          subtitle="View species composition table details"
          breadCrumbs={[
            { name: 'Configuration', path: '/configuration' },
            { name: 'Species composition', path: '/configuration/species-composition' },
          ]}
        />
      </Column>
      <Column lg={16} md={8} sm={4} className="species-composition-detail-column__notification">
        <PageNotification eventTarget="species-composition-detail" />
      </Column>
      <SpeciesCompositionDetailView data={data} />
      <Column
        lg={16}
        md={8}
        sm={4}
        className="species-composition-detail-column__actions"
        data-testid="species-composition-detail-actions"
      >
        <Button
          kind="secondary"
          onClick={() => navigateInTree(navigate, '/configuration/species-composition')}
          renderIcon={ArrowLeft}
        >
          Back
        </Button>
      </Column>
    </>
  );
};

export default SpeciesCompositionDetailPage;
