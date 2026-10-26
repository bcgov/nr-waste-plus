import { queryOptions } from '@tanstack/react-query';
import { notFound } from '@tanstack/react-router';

import { ApiError } from '@/config/api/types';
import { queryKeys } from '@/config/react-query/queryKeys';
import service from '@/services/APIs';

import type { AppRouterContext } from '@/routerContext';
import type { ReportingUnitDto } from '@/types/reportingUnit.types';

/**
 * Loader for the Reporting Unit Details page.
 *
 * Fetches the reporting unit data based on the `ruId` parameter.
 * Throws a router-level 404 if the unit is not found or the API returns 403/404.
 *
 * The `reporting-unit-details-enabled` flag check lives in the route's
 * `beforeLoad` (DEC-007); this loader only resolves data.
 *
 * @param opts - Loader arguments injected by TanStack Router.
 * @param opts.context - Router context (`AppRouterContext`) carrying the
 *   shared query client.
 * @param opts.params - The route parameters containing `ruId`.
 * @returns The reporting unit details.
 */
export const reportingUnitLoader = async ({
  context,
  params,
}: {
  context: AppRouterContext;
  params: { ruId: string };
}): Promise<ReportingUnitDto> => {
  const ruIdNum = Number(params.ruId);

  if (Number.isNaN(ruIdNum)) {
    throw notFound();
  }

  let data: ReportingUnitDto;
  try {
    data = await context.queryClient.ensureQueryData(
      queryOptions({
        queryKey: queryKeys.reportingUnit.details(ruIdNum),
        queryFn: () => service.reportingUnit.getReportingUnit(ruIdNum),
      }),
    );
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
