import { Column } from '@carbon/react';
import { useNavigate } from '@tanstack/react-router';
import { type FC } from 'react';

import ConfigurationCard from '@/components/core/ConfigurationCard';
import PageTitle from '@/components/core/PageTitle';
import { navigateInTree } from '@/routes/inTreePaths';

import './index.scss';

/**
 * Admin-only landing page for application configuration.
 *
 * Renders a {@link PageTitle} header followed by a set of {@link ConfigurationCard}
 * tiles, each linking to a specific configuration section. Card actions use
 * {@link navigateInTree} for type-safe in-tree navigation.
 *
 * Also registered as the router's `defaultNotFoundComponent`, so unmatched URLs
 * render this page as a fallback for authenticated users.
 *
 * @returns A fragment containing the page header and configuration card columns.
 */
const ConfigurationPage: FC = () => {
  const navigate = useNavigate();

  return (
    <>
      <Column lg={16} md={8} sm={4} className="configuration-column__header">
        <PageTitle title="Configuration" subtitle="Check and manage configuration data" />
      </Column>

      <Column lg={16} md={8} sm={4} className="configuration-column__cards">
        <ConfigurationCard
          title="District average waste volumes"
          description="Tables used to calculate volumes when district averages are used for waste assessment"
          buttonLabel="View or update tables →"
          kind="tertiary"
          onButtonClick={() => navigateInTree(navigate, '/configuration/district-volume-tables')}
        />
      </Column>
    </>
  );
};

export default ConfigurationPage;
