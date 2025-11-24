import { useQuery } from '@tanstack/react-query';
import { type FC } from 'react';

import { useAuth } from '@/context/auth/useAuth';
import APIs from '@/services/APIs';

import DistrictSelection from '@/components/core/DistrictSelection';
import type { DistrictType } from '@/components/core/DistrictSelection/types';

const ClientListing: FC = () => {  
  const { getClients } = useAuth();

  const filter = (client: DistrictType, keyword: string): boolean => {
    return client
            .name
            .trim()
            .toLowerCase()
            .includes(keyword.toLowerCase())
          || client.id.trim().toLowerCase() === keyword.toLowerCase();
  };

  return (<DistrictSelection
    queryHook={() =>
      useQuery({
        queryKey: ['forest-clients', 'search', getClients()],
        queryFn: () => APIs.forestclient.searchByClientNumbers(getClients(), 0, getClients().length),
        enabled: !!getClients().length,
        select: (data) => data.map((client) => ({
          id: client.clientNumber,
          name: client.name ?? client.clientName,
          kind: client.clientTypeCode?.code,
        })),
      })
    }
    preferenceKey="selectedClient"
    deselectLabel="Select no client"
    searchLabel="Search by client name or ID"
    filterFn={filter}
  />
  );
};

export default ClientListing;
