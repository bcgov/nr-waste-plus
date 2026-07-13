import { Column } from '@carbon/react';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';

import './index.scss';

/**
 * Page shell for the species composition list.
 *
 * Minimal stub — full data-table implementation is tracked in #1057.
 * Renders the page title and breadcrumb. The list table, search/filter
 * logic, and upload navigation will be added as a follow-up.
 *
 * @returns The species composition list page.
 */
const SpeciesCompositionListPage: FC = () => {
  return (
    <>
      <Column lg={16} md={8} sm={4} className="species-composition-column__header">
        <PageTitle
          title="District level species composition"
          subtitle="View tables used to calculate volumes when district average waste assessment is used"
          breadCrumbs={[{ name: 'Configuration', path: '/configuration' }]}
        />
      </Column>
      {/* Content placeholder — populated in #1057 */}
    </>
  );
};

export default SpeciesCompositionListPage;
