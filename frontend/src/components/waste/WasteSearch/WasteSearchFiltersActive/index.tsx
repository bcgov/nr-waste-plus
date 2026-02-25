import { Button, DismissibleTag } from '@carbon/react';
import { useCallback, type FC } from 'react';

import type { ReportingUnitSearchParametersViewDto } from '@/services/types';
import type { ArrayKey, DefinedValue, ElementOf } from '@/services/utils.types';

import { mapDisplayFilter } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';
import { reportingUnitSearchParametersView2Plain } from '@/services/search.utils';

import './index.scss';

type LocalDefinedValue<K extends keyof ReportingUnitSearchParametersViewDto> = DefinedValue<
  ReportingUnitSearchParametersViewDto,
  K
>;

type LocalArrayKey = ArrayKey<ReportingUnitSearchParametersViewDto>;

type WasteSearchFiltersActiveProps = {
  filters: ReportingUnitSearchParametersViewDto;
  onRemoveFilter: <K extends keyof ReportingUnitSearchParametersViewDto>(
    key: K,
    value?: ElementOf<LocalDefinedValue<K>>,
  ) => void;
};

const WasteSearchFiltersActive: FC<WasteSearchFiltersActiveProps> = ({
  filters,
  onRemoveFilter,
}) => {
  const plainFilters = reportingUnitSearchParametersView2Plain(filters);

  /**
   * Filter out some parameters, keeping only parameters that should generate a visible tag
   * It filters out:
   * - mainSearchTerm
   * - null values
   * - undefined values
   * - Empty strings
   * - Empty arrays
   */
  const visibleFilters = useCallback(
    () =>
      (Object.keys(filters) as (keyof ReportingUnitSearchParametersViewDto)[]).filter(
        (filterKey) => {
          if (filterKey === 'mainSearchTerm') return false; // Skip main search term
          const value = filters[filterKey];
          // Filter out:
          // - `null` or `undefined`
          // - Empty strings `""`
          // - Empty arrays `[]`
          if (
            value === undefined ||
            value === null ||
            value === '' ||
            value === false ||
            (Array.isArray(value) && value.length === 0)
          ) {
            return false;
          }
          return true;
        },
      ),
    [filters],
  );

  const renderFilters = visibleFilters().map((filterKey) => {
    const filterValue = filters[filterKey];

    if (Array.isArray(filterValue)) {
      const filterArrayKey = filterKey as LocalArrayKey;

      return filterValue.map((subValueRaw, index) => {
        const plainFilterValue = plainFilters[filterArrayKey];
        if (Array.isArray(plainFilterValue)) {
          const subValue = plainFilterValue[index];

          return (
            <DismissibleTag
              key={`dt-${filterArrayKey}-${subValue}`}
              data-testid={`dt-${filterArrayKey}-${subValue}`}
              className="search-dismissible-tag"
              size="md"
              type="outline"
              text={`${mapDisplayFilter(filterArrayKey)}: ${subValue}`}
              onClose={() => onRemoveFilter(filterArrayKey, subValueRaw)}
            />
          );
        }
      });
    }

    return (
      <DismissibleTag
        className="search-dismissible-tag"
        key={`dt-${filterKey}-${filterValue}`}
        data-testid={`dt-${filterKey}-${filterValue}`}
        size="md"
        type="outline"
        text={`${mapDisplayFilter(filterKey)}${typeof filterValue === 'boolean' ? '' : `: ${filterValue}`}`}
        onClose={() => onRemoveFilter(filterKey)}
      />
    );
  });

  const clearFilters = () =>
    visibleFilters().forEach((filterKey) => {
      const filterValue = filters[filterKey];

      if (Array.isArray(filterValue)) {
        const filterArrayKey = filterKey as LocalArrayKey;
        filterValue.forEach((subValue) => onRemoveFilter(filterArrayKey, subValue));
      }

      onRemoveFilter(filterKey);
    });

  return (
    <div data-testid="active-filters" className="display-contents">
      {renderFilters}
      {visibleFilters().length > 0 && (
        <Button id="clear-filters-button" kind="ghost" onClick={clearFilters}>
          Clear filters
        </Button>
      )}
    </div>
  );
};

export default WasteSearchFiltersActive;
