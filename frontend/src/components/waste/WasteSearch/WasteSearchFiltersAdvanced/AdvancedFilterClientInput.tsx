import { type FC } from 'react';

import type { CodeDescriptionDto } from '@/services/types';

import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import AutoCompleteInput from '@/components/Form/AutoCompleteInput';
import { activeMSItemToString } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';
import { useAuth } from '@/context/auth/useAuth';
import APIs from '@/services/APIs';
import { forestClientAutocompleteResult2CodeDescription } from '@/services/utils';

type AdvancedFilterClientInputProps = {
  /** The current list of selected clients from filters. */
  selectedClients?: CodeDescriptionDto[];
  /** The list of available clients for BCeID users. */
  myClients?: CodeDescriptionDto[];
  /** Callback handler for client selection changes. */
  onClientChange: (changes: { selectedItems: CodeDescriptionDto[] }) => void;
};

/**
 * Renders the client selector for advanced search, with conditional UI based on auth provider.
 *
 * - **IDIR users**: Autocomplete input that searches all forest clients across the system
 * - **BCeID users**: Multiselect dropdown limited to their own assigned clients
 *
 * @param props Component props.
 * @param props.selectedClients Currently selected client(s) from filter state.
 * @param props.myClients Client list for BCeID users (typically from query).
 * @param props.onClientChange Callback when selection changes.
 * @returns The appropriate client input component based on provider, or null.
 */
const AdvancedFilterClientInput: FC<AdvancedFilterClientInputProps> = ({
  selectedClients,
  myClients,
  onClientChange,
}) => {
  const auth = useAuth();

  // IDIR: Autocomplete search across all clients
  if (auth.user?.idpProvider === 'IDIR') {
    return (
      <AutoCompleteInput<CodeDescriptionDto>
        id="as-forestclient-client-ac"
        data-testid="forestclient-client-ac"
        titleText="Client"
        placeholder="Search by client name, number, or acronym"
        helperText="Search by client name, number or acronym"
        initialSelectedItem={selectedClients?.[0]}
        onAutoCompleteChange={async (value) =>
          (await APIs.forestclient.searchForestClients(value, 0, 10)).map(
            forestClientAutocompleteResult2CodeDescription,
          )
        }
        itemToString={(item) => {
          if (!item) return '';
          return item.description;
        }}
        onSelect={(rawData) => {
          const data = rawData ? [rawData as CodeDescriptionDto] : [];
          onClientChange({ selectedItems: data });
        }}
      />
    );
  }

  // BCeID: Multiselect limited to assigned clients
  if (auth.user?.idpProvider === 'BCEIDBUSINESS') {
    return (
      <ActiveMultiSelect
        placeholder="Client"
        titleText="Client"
        id="as-client-multi-select"
        items={myClients ?? []}
        itemToString={activeMSItemToString}
        onChange={onClientChange}
        selectedItems={(myClients ?? []).filter((option) =>
          (selectedClients || []).some((item) => item.code === option.code),
        )}
      />
    );
  }

  return null;
};

export default AdvancedFilterClientInput;
