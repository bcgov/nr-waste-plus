import { createFileRoute } from '@tanstack/react-router';

import FormulaConfigurationDetailPage from '@/pages/FormulaConfigurationDetail';

/**
 * `/configuration/formulas/$id` — formula detail.
 */
export const Route = createFileRoute('/_authenticated/_admin/configuration/formulas/$id')({
  component: FormulaConfigurationDetailPage,
  staticData: { title: 'Formula Configuration Detail' },
});
