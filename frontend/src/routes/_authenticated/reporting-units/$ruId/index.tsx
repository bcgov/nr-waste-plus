import { createFileRoute, notFound } from '@tanstack/react-router';

import { featureFlags } from '@/env';
import ReportingUnitDetailsPage from '@/pages/ReportingUnitDetails';
import { reportingUnitLoader } from '@/pages/ReportingUnitDetails/loader';

/**
 * `/reporting-units/$ruId` — reporting unit details.
 *
 * The `reporting-unit-details-enabled` gate moved from the loader to
 * `beforeLoad` (DEC-007); the loader now receives the router context and
 * resolves the unit through the shared query client.
 */
export const Route = createFileRoute('/_authenticated/reporting-units/$ruId/')({
  beforeLoad: () => {
    if (!featureFlags['reporting-unit-details-enabled']) throw notFound();
  },
  loader: ({ context, params }) => reportingUnitLoader({ context, params }),
  component: ReportingUnitDetailsPage,
  staticData: { title: 'Reporting Unit Details' },
});
