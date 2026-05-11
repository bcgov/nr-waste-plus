import { UnauthorizedUserAccess } from '@carbon/pictograms-react';
import { Column } from '@carbon/react';
import { useRouterState } from '@tanstack/react-router';
import { type FC } from 'react';

import EmptySection from '@/components/core/EmptySection';
import { getAccessViolationMessage } from '@/context/auth/userAccessValidation';

import './index.scss';

/**
 * Role Error page — shown when an authenticated user lacks permission for a specific route.
 *
 * Reads the `reason` query parameter from the current URL via {@link useRouterState}
 * and passes it to {@link getAccessViolationMessage} to resolve a human-readable
 * description. If no matching message is found, a generic fallback is displayed.
 *
 * The page is navigated to by {@link withProtected} when an authorisation check
 * fails, with the violation reason encoded as a search parameter.
 *
 * @returns The unauthorised-access column with a Carbon {@link EmptySection} pictogram.
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
