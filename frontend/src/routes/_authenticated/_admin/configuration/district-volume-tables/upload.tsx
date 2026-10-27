import { createFileRoute } from '@tanstack/react-router';

import DistrictVolumeTableUploadPage from '@/pages/DistrictVolumeTableUpload';

/**
 * `/configuration/district-volume-tables/upload` — static route outranks the
 * `$id` sibling.
 */
export const Route = createFileRoute(
  '/_authenticated/_admin/configuration/district-volume-tables/upload',
)({
  component: DistrictVolumeTableUploadPage,
  staticData: { title: 'Upload District Volume Table' },
});
