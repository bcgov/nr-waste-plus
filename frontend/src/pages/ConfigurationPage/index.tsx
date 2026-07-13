import { AccumulationRain, ArrowRight, CropGrowth } from '@carbon/icons-react';
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
        <div className="configuration-section">
          <h2 className="configuration-section__heading">District average criteria</h2>

          <div className="configuration-section__cards">
            <ConfigurationCard
              icon={<AccumulationRain />}
              title="District average waste volumes"
              description="Volume tables used to calculate volumes when district averages are used for waste assessment"
              buttonLabel="View or update tables"
              linkVariant={true}
              linkIcon={<ArrowRight />}
              onButtonClick={() =>
                navigateInTree(navigate, '/configuration/district-volume-tables')
              }
            />

            <ConfigurationCard
              icon={<CropGrowth />}
              title="District level species composition"
              description="Species composition table used to calculate volumes when HBS mark monthly billing report is not available"
              buttonLabel="View or update tables"
              linkVariant={true}
              linkIcon={<ArrowRight />}
              onButtonClick={() => navigateInTree(navigate, '/configuration/species-composition')}
            />
          </div>
        </div>
      </Column>
    </>
  );
};

export default ConfigurationPage;
