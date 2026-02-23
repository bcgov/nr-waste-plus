import { useQuery } from '@tanstack/react-query';
import { type FC } from 'react';

import type { DistrictType } from '@/components/core/DistrictSelection/types';
import type { CodeDescriptionDto } from '@/services/search.types';

import DistrictSelection from '@/components/core/DistrictSelection';
import { useAuth } from '@/context/auth/useAuth';
import APIs from '@/services/APIs';
import { forestClientAutocompleteResult2CodeDescription } from '@/services/utils';

const ClientListing: FC = () => {
  const { getClients } = useAuth();

  const filter = (client: DistrictType, keyword: string): boolean => {
    return (
      client.name.trim().toLowerCase().includes(keyword.toLowerCase()) ||
      client.id.trim().toLowerCase() === keyword.toLowerCase()
    );
  };

  const { data, isLoading } = useQuery({
    queryKey: ['forest-clients', 'search', getClients()],
    queryFn: () => APIs.forestclient.searchByClientNumbers(getClients(), 0, getClients().length),
    enabled: !!getClients().length,
    select: (data) =>
      data.map((client) => ({
        id: client.clientNumber,
        name: client.name ?? client.clientName,
        acronym: client.acronym,
        kind: client.clientTypeCode?.code,
      })),
  });

  return (
    <DistrictSelection<CodeDescriptionDto>
      queryHook={() => ({ data, isLoading })}
      preferenceKey="selectedClient"
      deselectLabel="Select no client"
      searchLabel="Search by client name or ID"
      filterFn={filter}
      isSelected={(item, userPreferenceValue) => userPreferenceValue?.code === item.id}
      districtTypeConverter={forestClientAutocompleteResult2CodeDescription}
    />
  );
};

export default ClientListing;
