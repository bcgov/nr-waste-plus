import { notFound } from '@tanstack/react-router';

import type { ReportingUnitDto } from '@/services/types';

import { ApiError } from '@/config/api/types';
import { queryClient } from '@/config/react-query/config';
import { queryKeys } from '@/config/react-query/queryKeys';
import service from '@/services/APIs';

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

  if (Number.isNaN(ruIdNum)) {
    throw notFound();
  }

  let data: ReportingUnitDto;
  try {
    data = await queryClient.ensureQueryData({
      queryKey: queryKeys.reportingUnit.details(ruIdNum),
      queryFn: () => service.reportingUnit.getReportingUnit(ruIdNum),
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) {
      throw notFound();
    }
    throw error;
  }

  if (!data) {
    throw notFound();
  }

  return data;
};
