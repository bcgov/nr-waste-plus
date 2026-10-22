import { SearchLocate } from '@carbon/icons-react';
import { createFileRoute } from '@tanstack/react-router';

import WasteSearchPage from '@/pages/WasteSearch';

/**
 * `/search` — authenticated waste search. Side-nav order 20.
 */
export const Route = createFileRoute('/_authenticated/search')({
  component: WasteSearchPage,
  staticData: {
    title: 'Waste search',
    nav: { label: 'Waste search', icon: SearchLocate, order: 20, to: '/search' },
  },
});
