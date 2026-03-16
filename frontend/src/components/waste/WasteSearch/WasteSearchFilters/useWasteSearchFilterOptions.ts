import { useQuery } from '@tanstack/react-query';

import type { CodeDescriptionDto } from '@/services/types';

import APIs from '@/services/APIs';

const REFERENCE_DATA_QUERY_CONFIG = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnReconnect: true,
  refetchOnMount: true,
} as const;

type WasteSearchFilterOptions = {
  samplingOptions: CodeDescriptionDto[];
  districtOptions: CodeDescriptionDto[];
  statusOptions: CodeDescriptionDto[];
};

/**
 * Loads the reference data options used by the waste-search filter bar.
 * All three datasets are cached indefinitely and shared across components.
 *
 * @returns The available sampling, district, and status options.
 */
export const useWasteSearchFilterOptions = (): WasteSearchFilterOptions => {
  const { data: samplingOptions } = useQuery({
    queryKey: ['samplingOptions'],
    queryFn: () => APIs.codes.getSamplingOptions(),
    ...REFERENCE_DATA_QUERY_CONFIG,
  });

  const { data: districtOptions } = useQuery({
    queryKey: ['districtOptions'],
    queryFn: () => APIs.codes.getDistricts(),
    ...REFERENCE_DATA_QUERY_CONFIG,
  });

  const { data: statusOptions } = useQuery({
    queryKey: ['statusOptions'],
    queryFn: () => APIs.codes.getAssessAreaStatuses(),
    ...REFERENCE_DATA_QUERY_CONFIG,
  });

  return {
    samplingOptions: samplingOptions ?? [],
    districtOptions: districtOptions ?? [],
    statusOptions: statusOptions ?? [],
  };
};
