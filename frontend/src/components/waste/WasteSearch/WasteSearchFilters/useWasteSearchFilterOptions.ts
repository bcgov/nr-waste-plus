import type { CodeDescriptionDto } from '@/services/types';

import { useWasteSearchFilterOptionsQueries } from '@/config/react-query/hooks';

type WasteSearchFilterOptions = {
  samplingOptions: CodeDescriptionDto[];
  districtOptions: CodeDescriptionDto[];
  statusOptions: CodeDescriptionDto[];
};

/**
 * Loads the reference data options used by the waste-search filter bar.
 * All three datasets are cached indefinitely and shared across components.
 * Uses batched queries to reduce React context calls and executions.
 *
 * @returns The available sampling, district, and status options.
 */
export const useWasteSearchFilterOptions = (): WasteSearchFilterOptions => {
  const [samplingOptionsQuery, districtOptionsQuery, statusOptionsQuery] =
    useWasteSearchFilterOptionsQueries('waste-search');

  return {
    samplingOptions: samplingOptionsQuery.data ?? [],
    districtOptions: districtOptionsQuery.data ?? [],
    statusOptions: statusOptionsQuery.data ?? [],
  };
};
