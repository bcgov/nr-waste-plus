import { createFileRoute } from '@tanstack/react-router';

import SpeciesCompositionUploadPage from '@/pages/SpeciesCompositionUpload';

/**
 * `/configuration/species-composition/upload` — static route outranks the
 * `$id` sibling.
 */
export const Route = createFileRoute(
  '/_authenticated/_admin/configuration/species-composition/upload',
)({
  component: SpeciesCompositionUploadPage,
  staticData: { title: 'Upload Species Composition' },
});
