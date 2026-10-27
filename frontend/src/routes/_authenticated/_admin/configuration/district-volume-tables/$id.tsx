import { createFileRoute } from '@tanstack/react-router';

import DistrictVolumeTableDetailPage from '@/pages/DistrictVolumeTableDetail';

/**
 * `/configuration/district-volume-tables/$id` — table detail.
 */
export const Route = createFileRoute(
  '/_authenticated/_admin/configuration/district-volume-tables/$id',
)({
  component: DistrictVolumeTableDetailPage,
  staticData: { title: 'District Volume Table Detail' },
});
