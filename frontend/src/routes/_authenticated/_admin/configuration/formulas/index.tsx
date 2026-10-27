import { createFileRoute } from '@tanstack/react-router';

import FormulaConfigurationListPage from '@/pages/FormulaConfigurationList';

/**
 * `/configuration/formulas` — list page.
 */
export const Route = createFileRoute('/_authenticated/_admin/configuration/formulas/')({
  component: FormulaConfigurationListPage,
  staticData: { title: 'Formula Configuration' },
});
