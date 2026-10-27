import { createFileRoute } from '@tanstack/react-router';

import SpeciesCompositionListPage from '@/pages/SpeciesCompositionList';

/**
 * `/configuration/species-composition` — list page.
 */
export const Route = createFileRoute('/_authenticated/_admin/configuration/species-composition/')({
  component: SpeciesCompositionListPage,
  staticData: { title: 'Species Composition' },
});
