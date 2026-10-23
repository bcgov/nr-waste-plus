import { SearchLocate } from '@carbon/icons-react';
import { createFileRoute } from '@tanstack/react-router';

import WasteSearchPage from '@/pages/WasteSearch';
import { validateWasteSearch } from '@/routing/searchParams';

/**
 * `/search` — authenticated waste search. Side-nav order 20.
 *
 * The route owns its filter state through `validateSearch` (#1238): the URL is
 * the single source of truth and `@/routing/searchParams` is the only place
 * that decides how each parameter is typed.
 */
export const Route = createFileRoute('/_authenticated/search')({
  validateSearch: validateWasteSearch,
  component: WasteSearchPage,
  staticData: {
    title: 'Waste search',
    nav: { label: 'Waste search', icon: SearchLocate, order: 20, to: '/search' },
  },
});
