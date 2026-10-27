import { createFileRoute } from '@tanstack/react-router';

import SpeciesCompositionDetailPage from '@/pages/SpeciesCompositionDetail';

/**
 * `/configuration/species-composition/$id` — composition detail.
 */
export const Route = createFileRoute(
  '/_authenticated/_admin/configuration/species-composition/$id',
)({
  component: SpeciesCompositionDetailPage,
  staticData: { title: 'Species Composition Detail' },
});
