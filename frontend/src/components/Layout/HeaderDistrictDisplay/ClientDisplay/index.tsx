import { type FC } from 'react';

import { useForestClientsByNumbersQuery } from '@/api/forestClients';
import HeaderDistrictDisplay from '@/components/Layout/HeaderDistrictDisplay';
import { useAuth } from '@/context/auth/useAuth';
import { usePreference } from '@/context/preference/usePreference';

import type { CodeDescriptionDto } from '@/api/search.types';

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
