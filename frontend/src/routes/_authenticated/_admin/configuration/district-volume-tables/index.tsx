import { createFileRoute } from '@tanstack/react-router';

import ConfigurationDistrictVolumeListPage from '@/pages/ConfigurationDistrictVolumeList';

/**
 * `/configuration/district-volume-tables` — list page.
 */
export const Route = createFileRoute(
  '/_authenticated/_admin/configuration/district-volume-tables/',
)({
  component: ConfigurationDistrictVolumeListPage,
  staticData: { title: 'District Volume Tables' },
});
