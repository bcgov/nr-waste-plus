import { useQuery } from '@tanstack/react-query';
import { type FC } from 'react';

import type { CodeDescriptionDto } from '@/services/search.types';

import HeaderDistrictDisplay from '@/components/Layout/HeaderDistrictDisplay';
import { useAuth } from '@/context/auth/useAuth';
import { usePreference } from '@/context/preference/usePreference';
import APIs from '@/services/APIs';

type ClientDisplayProps = {
  isActive: boolean;
};

const ClientDisplay: FC<ClientDisplayProps> = ({ isActive }) => {
  const { getClients } = useAuth();
  const { userPreference } = usePreference();
  const selectedClient = userPreference.selectedClient as CodeDescriptionDto | undefined;
  const { data, isLoading } = useQuery({
    queryKey: ['forest-clients', 'search', getClients()],
    queryFn: () => APIs.forestclient.searchByClientNumbers(getClients(), 0, getClients().length),
    enabled: !!getClients().length,
    select: (data) =>
      data
        .map((client) => ({
          id: client.clientNumber,
          name: client.name ?? client.clientName,
          acronym: client.acronym,
          kind: client.clientTypeCode?.code,
        }))
        .find((client) => client.id === selectedClient?.code),
  });

  return (
    <HeaderDistrictDisplay
      isActive={isActive}
      noSelectionText="No client selected"
      queryHook={() => ({ data, isLoading })}
    />
  );
};

export default ClientDisplay;
