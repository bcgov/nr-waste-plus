import { ChevronDown, ChevronUp } from '@carbon/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, type FC } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { usePreference } from '@/context/preference/usePreference';
import useBreakpoint from '@/hooks/useBreakpoint';
import APIs from '@/services/APIs';

type HeaderDistrictDisplayProps = {
  isActive: boolean;
};

const HeaderDistrictDisplay: FC<HeaderDistrictDisplayProps> = ({ isActive }) => {
  const { getClients } = useAuth();
  const breakpoint = useBreakpoint();
  const { userPreference } = usePreference();

  const userClientQuery = useQuery({
    queryKey: ['forest-clients', 'search', getClients()],
    queryFn: () => APIs.forestclient.searchByClientNumbers(getClients(), 0, getClients().length),
    enabled: !!getClients().length,
    select: (data) => data.find((client) => client.clientNumber === userPreference.selectedClient),
  });

  const showSimpleView = useMemo(
    () => breakpoint === 'sm' || !getClients().length,
    [breakpoint, getClients],
  );

  return (
    <>
      {showSimpleView ? null : (
        <p className="client-name" data-testid="client-name">
          {userClientQuery.data
            ? (userClientQuery.data.name ?? userClientQuery.data.clientName)
            : 'Client name not available'}
        </p>
      )}
      {showSimpleView ? null : isActive ? (
        <ChevronUp data-testid="active" />
      ) : (
        <ChevronDown data-testid="inactive" />
      )}
    </>
  );
};

export default HeaderDistrictDisplay;
