import { Search as SearchIcon, FilterEdit as FilterIcon } from '@carbon/icons-react';
import { Button, Column, Grid } from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState, type FC } from 'react';

import type { CodeDescriptionDto } from '@/services/types';
import type { ReportingUnitSearchParametersDto } from '@/services/types';

import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import SearchInput from '@/components/Form/SearchInput';
import WasteSearchFiltersActive from '@/components/waste/WasteSearch/WasteSearchFiltersActive';
import { activeMSItemToString } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';
import WasteSearchFiltersAdvanced from '@/components/waste/WasteSearch/WasteSearchFiltersAdvanced';
import useSyncPreferencesToFilters from '@/hooks/useSyncPreferencesToFilters';
import APIs from '@/services/APIs';

import './index.scss';

type WasteSearchFiltersProps = {
  value: ReportingUnitSearchParametersDto;
  onChange: (filters: ReportingUnitSearchParametersDto) => void;
  onSearch: () => void;
};

const WasteSearchFilters: FC<WasteSearchFiltersProps> = ({ value, onChange, onSearch }) => {
  const [filters, setFilters] = useState<ReportingUnitSearchParametersDto>(value);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] = useState<boolean>(false);

  const { data: samplingOptions } = useQuery({
    queryKey: ['samplingOptions'],
    queryFn: async () => await APIs.codes.getSamplingOptions(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  const { data: districtOptions } = useQuery({
    queryKey: ['districtOptions'],
    queryFn: async () => await APIs.codes.getDistricts(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  const { data: statusOptions } = useQuery({
    queryKey: ['statusOptions'],
    queryFn: async () => await APIs.codes.getAssessAreaStatuses(),
    staleTime: Infinity,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,
  });

  const handleStringChange = (key: keyof ReportingUnitSearchParametersDto) => (value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setTimeout(onSearch, 1);
  };

  const handleActiveMultiSelectChange =
    (key: keyof ReportingUnitSearchParametersDto) =>
    (changes: { selectedItems: CodeDescriptionDto[] }): void => {
      setFilters((prev) => ({
        ...prev,
        [key]: changes.selectedItems.map((item) => item.code),
      }));
    };

  const handleChange = (
    key: keyof ReportingUnitSearchParametersDto,
    value: string | CodeDescriptionDto[] | boolean | string[],
  ) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const onRemoveFilter = (key: keyof ReportingUnitSearchParametersDto, value?: string) => {
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
    onChange(filters);
  }, [filters, onChange]);

  useSyncPreferencesToFilters(
    setFilters,
    {
      selectedClient: 'clientNumbers',
      selectedDistrict: 'district',
    },
    (key, value) => {
      if (key === 'selectedClient' || key === 'selectedDistrict') {
        return value ? [value] : [];
      }
      return value;
    },
  );

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
          />
        </Column>

        {/* District multiselect */}
        <Column max={3} lg={4} md={2} sm={4} className="filters-column">
          <ActiveMultiSelect
            placeholder="District"
            id="district-multi-select"
            items={districtOptions ?? []}
            itemToString={activeMSItemToString}
            onChange={handleActiveMultiSelectChange('district')}
            selectedItems={(districtOptions ?? []).filter((option) =>
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
            items={samplingOptions ?? []}
            itemToString={activeMSItemToString}
            onChange={handleActiveMultiSelectChange('sampling')}
            selectedItems={(samplingOptions ?? []).filter((option) =>
              (filters.sampling || []).includes(option.code),
            )}
          />
        </Column>

        {/* Status multiselect */}
        <Column max={3} lg={4} md={2} sm={4} className="filters-column">
          <ActiveMultiSelect
            placeholder="Status"
            id="status-multi-select"
            items={statusOptions ?? []}
            itemToString={activeMSItemToString}
            onChange={handleActiveMultiSelectChange('status')}
            selectedItems={(statusOptions ?? []).filter((option) =>
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
            iconDescription="Advanced Search"
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
        samplingOptions={samplingOptions ?? []}
        districtOptions={districtOptions ?? []}
        statusOptions={statusOptions ?? []}
        onClose={() => setIsAdvancedSearchOpen(false)}
        onSearch={() => {
          setIsAdvancedSearchOpen(false);
          onSearch();
        }}
        onChange={(key) => (value) => handleChange(key, value)}
      />
    </>
  );
};

export default WasteSearchFilters;
