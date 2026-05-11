import { Column } from '@carbon/react';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';

/**
 * 404 Not Found fallback page.
 *
 * Rendered by TanStack Router's `defaultNotFoundComponent` when no route
 * matches the current URL. Displays a {@link PageTitle} with a static
 * "Content Not Found" heading and a descriptive subtitle.
 *
 * @returns The not-found content column.
 */
const NotFoundPage: FC = () => {
  return (
    <Column lg={16} md={8} sm={4} className="dashboard-column__banner">
      <PageTitle
        title="Content Not Found"
        subtitle="The page you are looking for does not exist."
      />
    </Column>
  );
};

export default NotFoundPage;
