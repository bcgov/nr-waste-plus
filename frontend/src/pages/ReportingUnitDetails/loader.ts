import { notFound } from '@tanstack/react-router';

import type { ReportingUnitDto } from '@/services/reportingunit.service';

import { queryClient } from '@/config/react-query/config';
import { queryKeys } from '@/config/react-query/queryKeys';
import service from '@/services/APIs';

/**
 * Loader for the Reporting Unit Details page.
 *
 * Fetches the reporting unit data based on the `ruId` parameter.
 * Throws a router-level 404 if the unit is not found.
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

  const data = await queryClient.ensureQueryData({
    queryKey: queryKeys.reportingUnit.details(ruIdNum),
    queryFn: () => service.reportingUnit.getReportingUnit(ruIdNum),
  });

  if (!data) {
    throw notFound();
  }

  return data;
};
