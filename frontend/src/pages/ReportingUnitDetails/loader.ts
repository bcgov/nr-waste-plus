import { notFound } from '@tanstack/react-router';

import { queryKeys } from '@/api/queryKeys';
import { fetchReportingUnit } from '@/api/reportingUnits';
import { queryClient } from '@/config/react-query/config';
import { featureFlags } from '@/env';
import { HttpError } from '@/http/types';

import type { ReportingUnitDto } from '@/api/types';

/**
 * Loader for the Reporting Unit Details page.
 *
 * Fetches the reporting unit data based on the `ruId` parameter.
 * Throws a router-level 404 if the unit is not found or the API returns 403/404.
 *
 * @param params - The route parameters containing `ruId`.
 * @returns The reporting unit details.
 */
export const reportingUnitLoader = async ({
  params,
}: {
  params: { ruId: string };
}): Promise<ReportingUnitDto> => {
  const ruIdNum = Number(params.ruId);

  if (!featureFlags['reporting-unit-details-enabled']) {
    throw notFound();
  }

  if (Number.isNaN(ruIdNum)) {
    throw notFound();
  }

  let data: ReportingUnitDto;
  try {
    data = await queryClient.ensureQueryData({
      queryKey: queryKeys.reportingUnit.details(ruIdNum),
      queryFn: ({ signal }) => fetchReportingUnit(ruIdNum, signal),
    });
  } catch (error) {
    if (error instanceof HttpError && (error.status === 404 || error.status === 403)) {
      throw notFound();
    }
    throw error;
  }

  if (!data) {
    throw notFound();
  }

  return data;
};
