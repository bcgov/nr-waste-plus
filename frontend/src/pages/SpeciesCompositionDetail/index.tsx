import { Column } from '@carbon/react';
import { useParams } from '@tanstack/react-router';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';

import './index.scss';

/**
 * Page shell for species composition detail view.
 *
 * Minimal stub — full implementation is tracked in #1059.
 * Renders the page title with breadcrumbs. The detail table,
 * zone breakdown, and metadata will be added as a follow-up.
 *
 * @returns The species composition detail page.
 */
const SpeciesCompositionDetailPage: FC = () => {
  const params = useParams({ strict: false });
  const id = Number(params.id);

  return (
    <>
      <Column lg={16} md={8} sm={4} className="species-composition-detail-column__banner">
        <PageTitle
          title={`Species composition: ${id}`}
          subtitle="View species composition table details"
          breadCrumbs={[
            { name: 'Configuration', path: '/configuration' },
            { name: 'Species composition', path: '/configuration/species-composition' },
          ]}
        />
      </Column>

      {/* Detail view — populated in #1059 */}
    </>
  );
};

export default SpeciesCompositionDetailPage;
