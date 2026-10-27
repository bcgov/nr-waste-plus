import { createFileRoute, notFound } from '@tanstack/react-router';

import { featureFlags } from '@/env';
import ReportingUnitBlockDetailsPage from '@/pages/ReportingUnitBlockDetails';

/**
 * `/reporting-units/$ruId/$blockId` — block details, gated by
 * `reporting-unit-block-details-enabled`.
 */
export const Route = createFileRoute('/_authenticated/reporting-units/$ruId/$blockId')({
  beforeLoad: () => {
    if (!featureFlags['reporting-unit-block-details-enabled']) throw notFound();
  },
  component: ReportingUnitBlockDetailsPage,
  staticData: { title: 'Reporting Unit Block Details' },
});
