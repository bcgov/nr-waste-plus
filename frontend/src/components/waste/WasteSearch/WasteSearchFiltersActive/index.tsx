import { Button, DismissibleTag } from '@carbon/react';
import { useCallback, type FC } from 'react';

import { mapDisplayFilter } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';

import type { ReportingUnitSearchParametersDto } from '@/services/types';

import './index.scss';

type WasteSearchFiltersActiveProps = {
  filters: ReportingUnitSearchParametersDto;
  onRemoveFilter: (key: keyof ReportingUnitSearchParametersDto, value?: string) => void;
};

const WasteSearchFiltersActive: FC<WasteSearchFiltersActiveProps> = ({
  filters,
  onRemoveFilter,
}) => {
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
      (Object.keys(filters) as (keyof ReportingUnitSearchParametersDto)[]).filter((filterKey) => {
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
          (Array.isArray(value) && value.length === 0)
        ) {
          return false;
        }
        return true;
      }),
    [filters],
  );

  const renderFilters = visibleFilters().map((filterKey) => {
    const filterValue = filters[filterKey];

    if (Array.isArray(filterValue)) {
      return filterValue.map((subValue) => (
        <DismissibleTag
          key={`dt-${filterKey}-${subValue}`}
          data-testid={`dt-${filterKey}-${subValue}`}
          className="silviculture-search-dismissible-tag"
          size="md"
          type="outline"
          text={`${mapDisplayFilter(filterKey)}: ${subValue}`}
          onClose={() => onRemoveFilter(filterKey, subValue)}
        />
      ));
    }

    return (
      <DismissibleTag
        className="search-dismissable-tag"
        key={`dt-${filterKey}-${filterValue}`}
        data-testid={`dt-${filterKey}-${filterValue}`}
        size="md"
        type="outline"
        text={`${mapDisplayFilter(filterKey)}${typeof filterValue === 'boolean' ? '' : `: ${filterValue}`}`}
        onClose={() => onRemoveFilter(filterKey)}
      />
    );
  });

  const clearFilters = () => visibleFilters().forEach((filterKey) => {
    const filterValue = filters[filterKey];

    if (Array.isArray(filterValue)) {
      filterValue.map((subValue) => (onRemoveFilter(filterKey, subValue)));
    }

    onRemoveFilter(filterKey);
  });



  return(<>
    {renderFilters}
    {visibleFilters().length > 0 && <Button id="clear-filters-button" kind="ghost" onClick={clearFilters}>Clear filters</Button>}
  </>);
};

export default WasteSearchFiltersActive;
