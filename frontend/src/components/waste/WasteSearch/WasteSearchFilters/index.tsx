import { Search as SearchIcon, FilterEdit as FilterIcon } from '@carbon/icons-react';
import { Button, Column, Grid } from '@carbon/react';
import { type FC } from 'react';

import type { ReportingUnitSearchParametersViewDto } from '@/services/types';

import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import SearchInput from '@/components/Form/SearchInput';
import { useWasteSearchFilterOptions } from '@/components/waste/WasteSearch/WasteSearchFilters/useWasteSearchFilterOptions';
import { useWasteSearchFilters } from '@/components/waste/WasteSearch/WasteSearchFilters/useWasteSearchFilters';
import WasteSearchFiltersActive from '@/components/waste/WasteSearch/WasteSearchFiltersActive';
import { activeMSItemToString } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';
import WasteSearchFiltersAdvanced from '@/components/waste/WasteSearch/WasteSearchFiltersAdvanced';

import './index.scss';

/** Props for the {@link WasteSearchFilters} component. */
type WasteSearchFiltersProps = {
  /** Current filter state that drives all filter controls. */
  value: ReportingUnitSearchParametersViewDto;
  /** Called whenever any filter field changes; receives the full updated filter object. */
  onChange: (filters: ReportingUnitSearchParametersViewDto) => void;
  /** Called when the user explicitly triggers a search (search button or Enter key). */
  onSearch: () => void;
};

/**
 * Primary filter bar for the waste-search page.
 *
 * Renders a search input, three multi-select dropdowns (sampling, district, status),
 * and active-filter tags. Also exposes an "Advanced Search" button that opens a
 * modal ({@link WasteSearchFiltersAdvanced}) for additional criteria.
 *
 * Filter state is managed internally by {@link useWasteSearchFilters} and kept in
 * sync with the URL search params via {@link useSyncFiltersToSearchParams}.
 * Dropdown option lists are fetched via {@link useWasteSearchFilterOptions}.
 *
 * @param props - Component props.
 * @param props.value - Current filter state that drives all filter controls.
 * @param props.onChange - Called whenever any filter field changes.
 * @param props.onSearch - Called when the user triggers a search.
 * @returns The filter bar column and advanced-search modal.
 */
const WasteSearchFilters: FC<WasteSearchFiltersProps> = ({ value, onChange, onSearch }) => {
  const { samplingOptions, districtOptions, statusOptions } = useWasteSearchFilterOptions();
  const {
    filters,
    isAdvancedSearchOpen,
    setIsAdvancedSearchOpen,
    handleStringChange,
    handleActiveMultiSelectChange,
    handleChange,
    onRemoveFilter,
  } = useWasteSearchFilters(value, onChange);

  return (
    <>
      <Grid className="table-filters-grid">
        {/* Main Search */}
        <Column max={5} lg={16} md={8} sm={4} className="filters-column">
          <SearchInput
            id="main-search"
            label="Search"
            placeholder="Search by RU No. or Block ID"
            value={filters.mainSearchTerm ?? ''}
            onChange={handleStringChange('mainSearchTerm')}
            onSearch={onSearch}
          />
        </Column>

        {/* District multiselect */}
        <Column max={3} lg={4} md={2} sm={4} className="filters-column">
          <ActiveMultiSelect
            placeholder="District"
            id="district-multi-select"
            items={districtOptions}
            itemToString={activeMSItemToString}
            onChange={handleActiveMultiSelectChange('district')}
            selectedItems={districtOptions.filter((option) =>
              (filters.district || []).includes(option.code),
            )}
          />
        </Column>

        {/* Sampling multiselect */}
        <Column max={3} lg={4} md={2} sm={4} className="filters-column">
          <ActiveMultiSelect
            placeholder="Sampling option"
            id="sampling-multi-select"
            data-testid="sampling-multi-select"
            items={samplingOptions}
            itemToString={activeMSItemToString}
            onChange={handleActiveMultiSelectChange('sampling')}
            selectedItems={samplingOptions.filter((option) =>
              (filters.sampling || []).includes(option.code),
            )}
          />
        </Column>

        {/* Status multiselect */}
        <Column max={3} lg={4} md={2} sm={4} className="filters-column">
          <ActiveMultiSelect
            placeholder="Status"
            id="status-multi-select"
            items={statusOptions}
            itemToString={activeMSItemToString}
            onChange={handleActiveMultiSelectChange('status')}
            selectedItems={statusOptions.filter((option) =>
              (filters.status || []).includes(option.code),
            )}
          />
        </Column>

        {/* Advanced Search and Search buttons, hidden on small */}
        <Column max={2} lg={4} md={2} sm={0} className="filters-column">
          <div className="search-buttons-container">
            <Button
              className="advanced-search-button"
              data-testid="advanced-search-button-most"
              renderIcon={FilterIcon}
              iconDescription="Advanced Search"
              type="button"
              size="md"
              kind="tertiary"
              hasIconOnly
              onClick={() => setIsAdvancedSearchOpen(true)}
            >
              Advanced Search
            </Button>
            <Button
              id="search-button-most"
              data-testid="search-button-most"
              className="search-button"
              renderIcon={SearchIcon}
              iconDescription="Search"
              type="button"
              size="md"
              onClick={() => {
                setIsAdvancedSearchOpen(false);
                onSearch();
              }}
            >
              Search
            </Button>
          </div>
        </Column>

        {/* Small Screen's Advanced Search button */}
        <Column className="search-col-sm" sm={4} md={0} lg={0} max={0}>
          <Button
            className="advanced-search-button"
            data-testid="advanced-search-button-sm"
            renderIcon={FilterIcon}
            iconDescription="Advanced filters"
            type="button"
            size="md"
            kind="tertiary"
            onClick={() => setIsAdvancedSearchOpen(true)}
          >
            Advanced Search
          </Button>
        </Column>

        {/* Small Screen's Search button */}
        <Column className="search-col-sm" sm={4} md={0} lg={0} max={0}>
          <Button
            id="search-button"
            data-testid="search-button-sm"
            className="search-button"
            renderIcon={SearchIcon}
            iconDescription="Search"
            type="button"
            size="md"
            onClick={() => {
              setIsAdvancedSearchOpen(false);
              onSearch();
            }}
          >
            Search
          </Button>
        </Column>

        {/* Active filters column */}
        <Column className="filter-bar-col" sm={4} md={8} lg={16}>
          <WasteSearchFiltersActive filters={filters} onRemoveFilter={onRemoveFilter} />
        </Column>
      </Grid>
      <WasteSearchFiltersAdvanced
        filters={filters}
        isModalOpen={isAdvancedSearchOpen}
        samplingOptions={samplingOptions}
        districtOptions={districtOptions}
        statusOptions={statusOptions}
        onClose={() => setIsAdvancedSearchOpen(false)}
        onSearch={() => {
          setIsAdvancedSearchOpen(false);
          onSearch();
        }}
        onChange={handleChange}
      />
    </>
  );
};

export default WasteSearchFilters;
