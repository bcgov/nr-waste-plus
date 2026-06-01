import { type FilterableMultiSelectProps } from '@carbon/react';
import { type FC } from 'react';

import type { CodeDescriptionDto } from '@/services/types';

import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import AutoCompleteInput from '@/components/Form/AutoCompleteInput';
import { activeMSItemToString } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';
import { useAuth } from '@/context/auth/useAuth';
import APIs from '@/services/APIs';
import { forestClientAutocompleteResult2CodeDescription } from '@/services/utils';

/**
 * Shared Carbon field props supported by both ComboBox and FilterableMultiSelect.
 * Derived directly from Carbon's types so they stay in sync automatically.
 */
type CarbonSharedFieldProps = Pick<
  FilterableMultiSelectProps<CodeDescriptionDto>,
  'invalid' | 'invalidText' | 'warn' | 'warnText'
>;

type AdvancedFilterClientInputProps = CarbonSharedFieldProps & {
  /** The current list of selected clients from filters. */
  selectedClients?: CodeDescriptionDto[];
  /** The list of available clients for BCeID users. */
  myClients?: CodeDescriptionDto[];
  /** Callback handler for client selection changes. */
  onClientChange: (changes: { selectedItems: CodeDescriptionDto[] }) => void;
  /** Callback handler for blur events. Receives the native FocusEvent from either input type. */
  onBlur?: (event: FocusEvent) => void;
};

/**
 * Renders the client selector for advanced search, with conditional UI based on auth provider.
 *
 * - **IDIR users**: Autocomplete input that searches all forest clients across the system
 * - **BCeID users**: Multiselect dropdown limited to their own assigned clients
 *
 * Carbon field props (`invalid`, `invalidText`, `warn`, `warnText`) are accepted and forwarded
 * transparently to the underlying Carbon component, matching the same consumer-driven pattern
 * used by `ActiveMultiSelect` and `AutoCompleteInput`.
 *
 * @param props Component props.
 * @param props.selectedClients Currently selected client(s) from filter state.
 * @param props.myClients Client list for BCeID users (typically from query).
 * @param props.onClientChange Callback when selection changes.
 * @param props.onBlur Callback when input loses focus.
 * @returns The appropriate client input component based on provider, or null.
 */
const AdvancedFilterClientInput: FC<AdvancedFilterClientInputProps> = ({
  selectedClients,
  myClients,
  onClientChange,
  onBlur,
  ...carbonProps
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
        itemToString={(item) => item!.description}
        onBlur={onBlur ? (e: React.FocusEvent) => onBlur(e.nativeEvent) : undefined}
        onSelect={(rawData) => {
          const data = rawData ? [rawData as CodeDescriptionDto] : [];
          onClientChange({ selectedItems: data });
        }}
        {...carbonProps}
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
        onBlur={onBlur}
        {...carbonProps}
      />
    );
  }

  return null;
};

export default AdvancedFilterClientInput;
