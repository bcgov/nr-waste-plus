import { useNavigate, useSearch } from '@tanstack/react-router';
import { useCallback, useMemo, useState, type ComponentProps } from 'react';

import WasteSearchFiltersActive from '@/components/waste/WasteSearch/WasteSearchFiltersActive';
import useSyncPreferencesToFilters from '@/hooks/useSyncPreferencesToFilters';
import { reportingUnitSearchParametersView2Plain } from '@/services/search.utils';

import { searchToViewDto, viewDtoToSearch } from './utils';

import type { WasteSearchFilters } from '@/routes/searchParams';
import type {
  CodeDescriptionDto,
  ReportingUnitSearchParametersDto,
  ReportingUnitSearchParametersViewDto,
} from '@/types/search.types';

/**
 * Reads the validated `/search` filter state from the router.
 *
 * The route tree is built programmatically (`routeTree.tsx` maps `RouteDescription`
 * entries through `createRoute`), which erases TanStack Router's per-route search
 * generics — so the validated shape is restored with an explicit cast here. This is
 * the single boundary: the `/search` route's `validateSearch` guarantees the shape,
 * and this hook is only ever rendered under that route.
 */
const useWasteSearchState = (): WasteSearchFilters =>
  (useSearch({ strict: false }) ?? {}) as WasteSearchFilters;

/** Shape of the object returned by {@link useWasteSearchFilters}. */
type UseWasteSearchFiltersReturn = {
  /** Current filter state, derived from the `/search` URL search params. */
  filters: ReportingUnitSearchParametersViewDto;
  /** Whether the Advanced Search modal is currently open. */
  isAdvancedSearchOpen: boolean;
  /** Opens or closes the Advanced Search modal. */
  setIsAdvancedSearchOpen: (open: boolean) => void;
  /** Returns a change handler for a single string filter key. */
  handleStringChange: (key: keyof ReportingUnitSearchParametersViewDto) => (value: string) => void;
  /** Returns a change handler for a multi-select filter key; maps `selectedItems` to code arrays. */
  handleActiveMultiSelectChange: (
    key: keyof ReportingUnitSearchParametersViewDto,
  ) => (changes: { selectedItems: CodeDescriptionDto[] }) => void;
  /** Returns a generic change handler that sets any filter key to an arbitrary value. */
  handleChange: <K extends keyof ReportingUnitSearchParametersViewDto>(
    key: K,
  ) => (value: ReportingUnitSearchParametersViewDto[K]) => void;
  /** Removes a single filter value or clears a filter key entirely. */
  onRemoveFilter: ComponentProps<typeof WasteSearchFiltersActive>['onRemoveFilter'];
};

/**
 * Waste-search filter state backed by the `/search` route's URL search params.
 *
 * The URL is the single source of truth (TanStack Router `validateSearch` with the
 * {@link WasteSearchFilters} schema): this hook derives the view-shaped filters from
 * the validated search object and writes updates back through `navigate`. There is
 * no local filter state and no hydration step — a URL like `/search?mainSearchTerm=…`
 * renders pre-filtered, and every change is immediately shareable/reloadable.
 *
 * User preferences (selected client/district) are applied on mount via
 * {@link useSyncPreferencesToFilters} by bridging its state-setter contract onto
 * route navigation.
 *
 * @returns Filter state, modal flag, and change handlers.
 */
export const useWasteSearchFilters = (): UseWasteSearchFiltersReturn => {
  const search = useWasteSearchState();
  const navigate = useNavigate();
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState<boolean>(false);

  const filters = useMemo(() => searchToViewDto(search), [search]);

  /**
   * Applies a filter update by rewriting the route's search params. The functional
   * updater receives the URL-derived state, so the URL remains authoritative even
   * when the update is triggered while the URL was changed externally (back/forward).
   */
  const applyFilters = useCallback(
    (
      compute: (prev: ReportingUnitSearchParametersViewDto) => ReportingUnitSearchParametersViewDto,
    ): void => {
      void navigate({
        search: (prev: WasteSearchFilters) => viewDtoToSearch(compute(searchToViewDto(prev))),
        replace: true,
      } as never);
    },
    [navigate],
  );

  const handleStringChange =
    (key: keyof ReportingUnitSearchParametersViewDto) => (value: string) => {
      applyFilters((prev) => ({ ...prev, [key]: value }));
    };

  const handleActiveMultiSelectChange =
    (key: keyof ReportingUnitSearchParametersViewDto) =>
    (changes: { selectedItems: CodeDescriptionDto[] }): void => {
      applyFilters((prev) => ({
        ...prev,
        [key]: changes.selectedItems.map((item) => item.code),
      }));
    };

  const handleChange =
    <K extends keyof ReportingUnitSearchParametersViewDto>(key: K) =>
    (value: ReportingUnitSearchParametersViewDto[K]) => {
      applyFilters((prev) => ({ ...prev, [key]: value }));
    };

  const onRemoveFilter: ComponentProps<typeof WasteSearchFiltersActive>['onRemoveFilter'] = (
    key,
    value,
  ) => {
    if (!value) {
      applyFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters[key];
        return newFilters;
      });
    } else {
      // View-shaped arrays may hold CodeDescriptionDto items (clientNumbers); the
      // removed value is the plain code string, so compare items by their code.
      applyFilters((prev) => ({
        ...prev,
        [key]: (prev[key] as Array<string | { code?: string }>).filter(
          (item) => (typeof item === 'object' && item !== null ? item.code : item) !== value,
        ),
      }));
    }
  };

  useSyncPreferencesToFilters(
    useCallback(
      (updater: Parameters<typeof applyFilters>[0] | ReportingUnitSearchParametersViewDto) => {
        if (typeof updater === 'function') {
          applyFilters(updater);
        } else {
          applyFilters(() => updater);
        }
      },
      [applyFilters],
    ),
    {
      selectedClient: 'clientNumbers',
      selectedDistrict: 'district',
    },
    (key, value): string | boolean | string[] | CodeDescriptionDto[] | undefined => {
      if (key === 'selectedClient' || key === 'selectedDistrict') {
        return (value ? [value] : []) as string[] | CodeDescriptionDto[];
      }
      return value as string | boolean | string[] | undefined;
    },
  );

  return {
    filters,
    isAdvancedSearchOpen,
    setIsAdvancedSearchOpen,
    handleStringChange,
    handleActiveMultiSelectChange,
    handleChange,
    onRemoveFilter,
  };
};

/**
 * Derives the plain (backend-shaped) filter object for the waste search from the
 * `/search` URL state. Used by {@link WasteSearchTable} to drive the query without
 * owning filter state.
 *
 * @returns The plain search-parameters object (empty values stripped).
 */
export const useWasteSearchPlainFilters = (): ReportingUnitSearchParametersDto => {
  const search = useWasteSearchState();
  return useMemo(() => reportingUnitSearchParametersView2Plain(searchToViewDto(search)), [search]);
};
