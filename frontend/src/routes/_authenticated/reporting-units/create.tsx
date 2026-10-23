import { DocumentAdd } from '@carbon/icons-react';
import { createFileRoute, notFound } from '@tanstack/react-router';

import { featureFlags } from '@/env';
import ReportingUnitCreatePage from '@/pages/ReportingUnitCreate';

/**
 * `/reporting-units/create` — gated by `reporting-unit-create-enabled`
 * (`beforeLoad` throws a router-level 404 when disabled; DEC-007).
 * Static route outranks the `$ruId` sibling. Side-nav order 30.
 */
export const Route = createFileRoute('/_authenticated/reporting-units/create')({
  beforeLoad: () => {
    if (!featureFlags['reporting-unit-create-enabled']) throw notFound();
  },
  component: ReportingUnitCreatePage,
  staticData: {
    title: 'Create reporting unit',
    featureFlag: 'reporting-unit-create-enabled',
    nav: {
      label: 'Create reporting unit',
      icon: DocumentAdd,
      order: 30,
      to: '/reporting-units/create',
    },
  },
});
