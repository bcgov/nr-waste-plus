import { createFileRoute } from '@tanstack/react-router';

import FormulaConfigurationCreatePage from '@/pages/FormulaConfigurationCreate';

/**
 * `/configuration/formulas/new` — create form; static route outranks the
 * `$id` sibling.
 */
export const Route = createFileRoute('/_authenticated/_admin/configuration/formulas/new')({
  component: FormulaConfigurationCreatePage,
  staticData: { title: 'Create Formula Configuration' },
});
