import { type FC } from 'react';

import type { DistrictType } from '@/components/core/DistrictSelection/types';
import type { CodeDescriptionDto } from '@/services/search.types';

import DistrictSelection from '@/components/core/DistrictSelection';
import { useForestClientsByNumbersQuery } from '@/config/react-query/hooks';
import { useAuth } from '@/context/auth/useAuth';
import { forestClientAutocompleteResult2CodeDescription } from '@/services/utils';

/**
 * Loads the current user's clients and renders the default client preference selector.
 *
 * @returns The client selection list.
 */
const ClientListing: FC = () => {
  const { getClients } = useAuth();

  /**
   * Matches clients by name or exact client number.
   *
   * @param client The client option being evaluated.
   * @param keyword The user-entered search term.
   * @returns True when the option should remain visible.
   */
  const filter = (client: DistrictType, keyword: string): boolean => {
    return (
      client.name.trim().toLowerCase().includes(keyword.toLowerCase()) ||
      client.id.trim().toLowerCase() === keyword.toLowerCase()
    );
  };

  const clientNumbers = getClients();
  const { data, isLoading } = useForestClientsByNumbersQuery(clientNumbers, {
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
