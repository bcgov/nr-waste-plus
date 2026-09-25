import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  FormulaSetResponse,
  FormulaSetRequest,
  FormulaSetEffectiveParams,
  CurrentFormulaSetParams,
  FormulaVariablesParams,
} from '@/services/formulaConfiguration.types';
import type { SortDirectionType } from '@/services/types';

import API from '@/services/APIs';
import { generateSortArray } from '@/services/utils';

const formulaConfiguration = API.formulaConfiguration;

export type FormulaConfigurationQueryParams = {
  page: number;
  size: number;
  sort: Record<string, SortDirectionType>;
};

// ─── Query Keys ────────────────────────────────────────────────────────────────

export const formulaConfigurationKeys = {
  all: ['formulaConfiguration'] as const,
  lists: () => [...formulaConfigurationKeys.all, 'list'] as const,
  list: (params: FormulaConfigurationQueryParams) =>
    [...formulaConfigurationKeys.lists(), params] as const,
  effective: (params: FormulaSetEffectiveParams) =>
    [...formulaConfigurationKeys.all, 'effective', params] as const,
  detail: (id: number) => [...formulaConfigurationKeys.all, 'detail', id] as const,
  current: (params: CurrentFormulaSetParams) =>
    [...formulaConfigurationKeys.all, 'current', params] as const,
  variables: (params: FormulaVariablesParams) =>
    [...formulaConfigurationKeys.all, 'variables', params] as const,
};

// ─── Queries ───────────────────────────────────────────────────────────────────

/**
 * Fetches a paginated list of formula sets.
 */
export function useFormulaSetList(
  params: FormulaConfigurationQueryParams,
  options?: { enabled?: boolean; staleTime?: number },
) {
  return useQuery({
    queryKey: formulaConfigurationKeys.list(params),
    queryFn: () =>
      formulaConfiguration.getFormulaSets({
        page: params.page,
        size: params.size,
        sort: generateSortArray<FormulaSetResponse>(params.sort),
      }),
    placeholderData: keepPreviousData,
    ...options,
  });
}

/**
 * Fetches the formula set effective for the given date and area.
 */
export function useEffectiveFormulaSet(params: FormulaSetEffectiveParams, enabled = true) {
  return useQuery({
    queryKey: formulaConfigurationKeys.effective(params),
    queryFn: () => formulaConfiguration.getEffectiveFormulaSet(params),
    enabled: enabled && !!params.date && !!params.area,
  });
}

/**
 * Fetches a single formula set by ID.
 */
export function useFormulaSetDetail(id?: number, options?: { notificationTarget?: string }) {
  return useQuery({
    queryKey:
      typeof id === 'number'
        ? formulaConfigurationKeys.detail(id)
        : ['formulaConfiguration', 'detail', 'disabled'],
    queryFn: () => formulaConfiguration.getFormulaSet(id!),
    enabled: typeof id === 'number',
    meta: options?.notificationTarget
      ? { notificationTarget: options.notificationTarget }
      : undefined,
  });
}

export function useCurrentOpenEndedFormulaSet(params: CurrentFormulaSetParams, enabled = true) {
  return useQuery({
    queryKey: formulaConfigurationKeys.current(params),
    queryFn: () => formulaConfiguration.getCurrentOpenEndedFormulaSet(params),
    enabled: enabled && !!params.area,
  });
}

/**
 * Fetches available formula variables for a given date and area.
 * Returns three representations: nested tree, flat map, and schema.
 */
export function useFormulaVariables(params: FormulaVariablesParams, enabled = true) {
  return useQuery({
    queryKey: formulaConfigurationKeys.variables(params),
    queryFn: () => formulaConfiguration.getVariables(params),
    enabled: enabled && !!params.date && !!params.area && !!params.districtCode,
    staleTime: 5 * 60 * 1000, // 5 minutes — variable values change with date/area
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Creates a new formula set.
 */
export function useCreateFormulaSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dto: FormulaSetRequest) => formulaConfiguration.createFormulaSet(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: formulaConfigurationKeys.lists() });
    },
  });
}

/**
 * Updates a formula set with a complete replacement.
 */
export function useUpdateFormulaSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: FormulaSetRequest }) =>
      formulaConfiguration.updateFormulaSet(id, dto),
    onSuccess: (updated: FormulaSetResponse) => {
      queryClient.invalidateQueries({ queryKey: formulaConfigurationKeys.lists() });
      queryClient.setQueryData(formulaConfigurationKeys.detail(updated.id), updated);
    },
  });
}

/**
 * Soft-deletes a future open-ended formula set.
 */
export function useDeleteFormulaSet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => formulaConfiguration.deleteFormulaSet(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: formulaConfigurationKeys.lists() });
      queryClient.removeQueries({ queryKey: formulaConfigurationKeys.detail(id) });
    },
  });
}
