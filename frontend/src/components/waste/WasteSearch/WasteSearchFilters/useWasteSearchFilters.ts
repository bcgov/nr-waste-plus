import { useEffect, useState, type ComponentProps } from 'react';

import type { CodeDescriptionDto, ReportingUnitSearchParametersViewDto } from '@/services/types';

import { clientNumbersTransform } from '@/components/waste/WasteSearch/WasteSearchFilters/utils';
import WasteSearchFiltersActive from '@/components/waste/WasteSearch/WasteSearchFiltersActive';
import useSyncFiltersToSearchParams from '@/hooks/useSyncFiltersToSearchParams';
import useSyncPreferencesToFilters from '@/hooks/useSyncPreferencesToFilters';
import { removeEmpty } from '@/services/utils';

/** Shape of the object returned by {@link useWasteSearchFilters}. */
type UseWasteSearchFiltersReturn = {
  /** Current filter state, kept in sync with the parent's `value` prop. */
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
 * Manages waste-search filter state, URL sync, preference sync, and all update handlers.
 *
 * URL search params are kept in sync via {@link useSyncFiltersToSearchParams};
 * user preferences are applied on mount via {@link useSyncPreferencesToFilters}.
 * Empty array values are stripped before calling `onChange` via {@link removeEmpty}.
 *
 * @param value - The initial filter state provided by the parent.
 * @param onChange - Called with the cleaned filter state whenever any filter changes.
 * @returns An object containing the current filter state, modal flag, and change handlers.
 */
export const useWasteSearchFilters = (
  value: ReportingUnitSearchParametersViewDto,
  onChange: (filters: ReportingUnitSearchParametersViewDto) => void,
): UseWasteSearchFiltersReturn => {
  const [filters, setFilters] = useState<ReportingUnitSearchParametersViewDto>(value);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState<boolean>(false);

  useSyncFiltersToSearchParams(filters, setFilters, { transforms: clientNumbersTransform });

  const handleStringChange =
    (key: keyof ReportingUnitSearchParametersViewDto) => (value: string) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    };

  const handleActiveMultiSelectChange =
    (key: keyof ReportingUnitSearchParametersViewDto) =>
    (changes: { selectedItems: CodeDescriptionDto[] }): void => {
      setFilters((prev) => ({
        ...prev,
        [key]: changes.selectedItems.map((item) => item.code),
      }));
    };

  const handleChange = <K extends keyof ReportingUnitSearchParametersViewDto>(
    key: K,
  ): ((value: ReportingUnitSearchParametersViewDto[K]) => void) => {
    return (value: ReportingUnitSearchParametersViewDto[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    };
  };

  const onRemoveFilter: ComponentProps<typeof WasteSearchFiltersActive>['onRemoveFilter'] = (
    key,
    value,
  ) => {
    if (!value) {
      setFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters[key];
        return newFilters;
      });
    } else {
      setFilters((prev) => ({
        ...prev,
        [key]: (prev[key] as string[]).filter((item) => item !== value),
      }));
    }
  };

  useEffect(() => {
    onChange(removeEmpty(filters));
  }, [filters, onChange]);

  useSyncPreferencesToFilters(
    setFilters,
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
