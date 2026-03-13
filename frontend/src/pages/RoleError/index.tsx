import { Column } from '@carbon/react';
import { type FC } from 'react';
import { useLocation } from 'react-router-dom';

import EmptySection from '@/components/core/EmptySection';
import { getAccessViolationMessage } from '@/context/auth/userAccessValidation';

import './index.scss';

const RoleErrorPage: FC = () => {
  const { search } = useLocation();
  const violationReason = new URLSearchParams(search).get('reason');
  const description =
    getAccessViolationMessage(violationReason) ??
    'You do not have the necessary permissions to view this page.';

  return (
    <Column lg={16} md={8} sm={4} className="unauthorized-column__body">
      <EmptySection
        pictogram="UnauthorizedUserAccess"
        title="Unauthorized Access"
        description={description}
        className="unauthorized__section"
      />
    </Column>
  );
};

export default RoleErrorPage;
