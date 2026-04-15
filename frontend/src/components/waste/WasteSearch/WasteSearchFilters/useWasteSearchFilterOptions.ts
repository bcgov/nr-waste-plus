import type { CodeDescriptionDto } from '@/services/types';

import { useCodesQuery } from '@/config/react-query/hooks';

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
  const { data: samplingOptions } = useCodesQuery('samplingOptions', {
    notificationTarget: 'waste-search',
  });

  const { data: districtOptions } = useCodesQuery('districtOptions', {
    notificationTarget: 'waste-search',
  });

  const { data: statusOptions } = useCodesQuery('statusOptions', {
    notificationTarget: 'waste-search',
  });

  return {
    samplingOptions: samplingOptions ?? [],
    districtOptions: districtOptions ?? [],
    statusOptions: statusOptions ?? [],
  };
};
