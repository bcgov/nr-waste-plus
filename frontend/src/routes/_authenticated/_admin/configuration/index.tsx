import { createFileRoute } from '@tanstack/react-router';

import ConfigurationPage from '@/pages/ConfigurationPage';

/**
 * `/configuration` — admin landing list page.
 */
export const Route = createFileRoute('/_authenticated/_admin/configuration/')({
  component: ConfigurationPage,
  staticData: { title: 'Configuration' },
});
