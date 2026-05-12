import { Column } from '@carbon/react';
import { type FC } from 'react';

import PageTitle from '@/components/core/PageTitle';

/**
 * 404 Not Found fallback page.
 *
 * Registered as `defaultNotFoundComponent` on the router in `routeTree.tsx`, so it is
 * rendered for any URL that does not match a registered route. Root-level unmatched URLs
 * are additionally handled by `NotFoundRedirect` (which redirects to `/`) on the root
 * route's `notFoundComponent`.
 *
 * Displays a {@link PageTitle} with a static "Content Not Found" heading and subtitle.
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
