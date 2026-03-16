import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import type { CodeDescriptionDto, ReportingUnitSearchParametersViewDto } from '@/services/types';

import { useAuth } from '@/context/auth/useAuth';
import APIs from '@/services/APIs';
import { forestClientAutocompleteResult2CodeDescription } from '@/services/utils';

/**
 * Resolves missing client descriptions from API when URL params carry code-only entries.
 *
 * When filter state arrives from URL parameters, client numbers may only have their code populated
 * (e.g., { code: '12345', description: '12345' }). This hook detects that condition and fetches
 * the full client details from the API, then invokes a callback to update the filter state.
 *
 * The hook safeguards against:
 * - Firing lookups when a full description is already present
 * - Firing lookups while the modal is closed (unnecessary API call)
 * - Firing duplicate lookups if onChange reference changes across parent re-renders
 *
 * @param isModalOpen Whether the advanced search modal is currently visible.
 * @param clientNumberEntry The first client number entry from filters, if any.
 * @param onChange Curried handler factory for updating the clientNumbers filter.
 *
 * @example
 * ```tsx
 * useClientLookup(isModalOpen, filters.clientNumbers?.[0], onChange);
 * // When URL params have { code: '12345', description: '12345' },
 * // the hook fetches full details and calls onChange('clientNumbers')([resolved data])
 * ```
 */
export const useClientLookup = (
  isModalOpen: boolean,
  clientNumberEntry: CodeDescriptionDto | undefined,
  onChange: (key: keyof ReportingUnitSearchParametersViewDto) => (value: unknown) => void,
) => {
  const auth = useAuth();

  // Detect code-only condition: code and description are identical, or description is missing.
  // This indicates the entry came from URL params and needs full resolution.
  const hasClientCodeOnly = Boolean(
    clientNumberEntry?.code &&
      (clientNumberEntry?.description === clientNumberEntry?.code ||
        !clientNumberEntry?.description),
  );

  // Query to resolve the full client details from the API.
  const { data: resolvedClient } = useQuery({
    queryKey: ['clientLookup', clientNumberEntry?.code],
    queryFn: async () =>
      (await APIs.forestclient.searchForestClients(clientNumberEntry!.code, 0, 1)).map(
        forestClientAutocompleteResult2CodeDescription,
      ),
    enabled: isModalOpen && hasClientCodeOnly && auth.user?.idpProvider === 'IDIR',
    staleTime: Infinity,
  });

  // Track the client code we have already promoted to avoid calling onChange
  // again when only the onChange reference changes across parent re-renders.
  const appliedClientCode = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!isModalOpen) return;

    const first = resolvedClient?.[0];
    if (first && first.code !== appliedClientCode.current) {
      appliedClientCode.current = first.code;
      onChange('clientNumbers')([first]);
    }
  }, [isModalOpen, resolvedClient, onChange]);
};
