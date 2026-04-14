import { type FC } from 'react';

import type { CodeDescriptionDto } from '@/services/search.types';

import HeaderDistrictDisplay from '@/components/Layout/HeaderDistrictDisplay';
import { useForestClientsByNumbersQuery } from '@/config/react-query/hooks';
import { useAuth } from '@/context/auth/useAuth';
import { usePreference } from '@/context/preference/usePreference';

type ClientDisplayProps = {
  isActive: boolean;
};

const ClientDisplay: FC<ClientDisplayProps> = ({ isActive }) => {
  const { getClients } = useAuth();
  const { userPreference } = usePreference();
  const selectedClient = userPreference.selectedClient as CodeDescriptionDto | undefined;
  const clientNumbers = getClients();
  const { data, isLoading } = useForestClientsByNumbersQuery(clientNumbers, {
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
