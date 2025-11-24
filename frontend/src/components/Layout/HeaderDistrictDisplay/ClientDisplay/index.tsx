import { useQuery } from '@tanstack/react-query';
import { type FC } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import { usePreference } from '@/context/preference/usePreference';
import APIs from '@/services/APIs';
import HeaderDistrictDisplay from '@/components/Layout/HeaderDistrictDisplay';

type ClientDisplayProps = {
  isActive: boolean;
};

const ClientDisplay: FC<ClientDisplayProps> = ({ isActive }) => {
  const { getClients } = useAuth();
  const { userPreference } = usePreference();
  const {data, isLoading} = useQuery({
        queryKey: ['forest-clients', 'search', getClients()],
        queryFn: () => APIs.forestclient.searchByClientNumbers(getClients(), 0, getClients().length),
        enabled: !!getClients().length,
        select: (data) => data
        .map((client) => ({ id: client.clientNumber, name: client.name ?? client.clientName, kind: client.clientTypeCode?.code }))
        .find((client) => client.id === userPreference.selectedClient),
      });

  return (<HeaderDistrictDisplay 
    isActive={isActive} 
    noSelectionText='No client selected'
    queryHook={() => ({data, isLoading})}      
    />
  );
};

export default ClientDisplay;
