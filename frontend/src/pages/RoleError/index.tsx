import { UnauthorizedUserAccess } from '@carbon/pictograms-react';
import { Column } from '@carbon/react';
import { useRouterState } from '@tanstack/react-router';
import { type FC } from 'react';

import EmptySection from '@/components/core/EmptySection';
import { getAccessViolationMessage } from '@/context/auth/userAccessValidation';

import './index.scss';

/**
 * Displays an access violation message for authenticated users who cannot view a route.
 *
 * @returns The unauthorized page content.
 */
const RoleErrorPage: FC = () => {
  const searchStr = useRouterState({ select: (s) => s.location.searchStr });
  const violationReason = new URLSearchParams(searchStr).get('reason');
  const description =
    getAccessViolationMessage(violationReason) ??
    'You do not have the necessary permissions to view this page.';

  return (
    <Column lg={16} md={8} sm={4} className="unauthorized-column__body">
      <EmptySection
        pictogram={UnauthorizedUserAccess}
        title="Unauthorized Access"
        description={description}
        className="unauthorized__section"
      />
    </Column>
  );
};

export default RoleErrorPage;
