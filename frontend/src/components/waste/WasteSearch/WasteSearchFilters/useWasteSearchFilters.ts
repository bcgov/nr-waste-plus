import { useEffect, useState, type ComponentProps } from 'react';

import type { CodeDescriptionDto, ReportingUnitSearchParametersViewDto } from '@/services/types';

import { clientNumbersTransform } from '@/components/waste/WasteSearch/WasteSearchFilters/utils';
import WasteSearchFiltersActive from '@/components/waste/WasteSearch/WasteSearchFiltersActive';
import useSyncFiltersToSearchParams from '@/hooks/useSyncFiltersToSearchParams';
import useSyncPreferencesToFilters from '@/hooks/useSyncPreferencesToFilters';
import { removeEmpty } from '@/services/utils';

type UseWasteSearchFiltersReturn = {
  filters: ReportingUnitSearchParametersViewDto;
  isAdvancedSearchOpen: boolean;
  setIsAdvancedSearchOpen: (open: boolean) => void;
  handleStringChange: (key: keyof ReportingUnitSearchParametersViewDto) => (value: string) => void;
  handleActiveMultiSelectChange: (
    key: keyof ReportingUnitSearchParametersViewDto,
  ) => (changes: { selectedItems: CodeDescriptionDto[] }) => void;
  handleChange: (
    key: keyof ReportingUnitSearchParametersViewDto,
  ) => (value: ReportingUnitSearchParametersViewDto[typeof key]) => void;
  onRemoveFilter: ComponentProps<typeof WasteSearchFiltersActive>['onRemoveFilter'];
};

/**
 * Manages waste-search filter state, URL sync, preference sync, and all update handlers.
 *
 * @param value The initial filter state from the parent.
 * @param onChange Callback fired with the cleaned filter state whenever filters change.
 * @returns Filter state, modal visibility flag, and all change handlers.
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

  const handleChange = (
    key: keyof ReportingUnitSearchParametersViewDto,
  ): ((value: ReportingUnitSearchParametersViewDto[typeof key]) => void) => {
    return (value: ReportingUnitSearchParametersViewDto[typeof key]) => {
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
