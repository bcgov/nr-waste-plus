import { Search as SearchIcon } from '@carbon/icons-react';
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Column,
  ComboBox,
  ComposedModal,
  DatePicker,
  DatePickerInput,
  Grid,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextInput,
} from '@carbon/react';
import { useQuery } from '@tanstack/react-query';
import { DateTime } from 'luxon';
import { type FC } from 'react';

import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import AutoCompleteInput from '@/components/Form/AutoCompleteInput';
import SearchInput from '@/components/Form/SearchInput';
import APIs from '@/services/APIs';

import {
  DATE_PICKER_FORMAT,
  API_DATE_FORMAT,
  MAX_TEXT_INPUT_LEN,
  getStartMaxDate,
  getStartDateValue,
  getEndMinDate,
  getEndDateValue,
} from './utils';

import type {
  CodeDescriptionDto,
  ForestClientAutocompleteResultDto,
  ReportingUnitSearchParametersDto,
} from '@/services/types';

import './index.scss';

type WasteSearchFiltersAdvancedProps = {
  filters: ReportingUnitSearchParametersDto;
  isModalOpen: boolean;
  samplingOptions: CodeDescriptionDto[];
  districtOptions: CodeDescriptionDto[];
  statusOptions: CodeDescriptionDto[];
  onClose: () => void;
  onChange: (
    key: keyof ReportingUnitSearchParametersDto,
  ) => (value: string | CodeDescriptionDto[] | boolean) => void;
  onSearch: () => void;
};

const WasteSearchFiltersAdvanced: FC<WasteSearchFiltersAdvancedProps> = ({
  filters,
  isModalOpen,
  samplingOptions,
  districtOptions,
  statusOptions,
  onClose,
  onChange,
  onSearch,
}) => {
  const onCheckBoxChange =
    (key: keyof ReportingUnitSearchParametersDto) =>
    (_: React.ChangeEvent<HTMLInputElement>, data: { checked: boolean; id: string }) => {
      onChange(key)(data.checked);
    };

  const onActiveMultiSelectChange =
    (key: keyof ReportingUnitSearchParametersDto) =>
    (changes: { selectedItems: CodeDescriptionDto[] }): void => {
      onChange(key)(changes.selectedItems);
    };

  const onTextChange =
    (key: keyof ReportingUnitSearchParametersDto) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      onChange(key)(event.target.value);
    };

  const handleDateChange = (isStartDate: boolean) => (dates?: Date[]) => {
    if (!dates) return;

    const formattedDate =
      dates.length && dates[0] ? DateTime.fromJSDate(dates[0]).toFormat(API_DATE_FORMAT) : '';

    onChange(isStartDate ? 'updateDateStart' : 'updateDateEnd')(formattedDate);
  };

  const { data: locationData } = useQuery({
    queryKey: ['locationCodes', filters.clientNumber],
    queryFn: () => APIs.forestclient.getForestClientLocations(filters.clientNumber || ''),
    enabled: !!filters.clientNumber,
  });

  return (
    <ComposedModal
      className="advanced-search-modal"
      data-testid="advanced-search-modal"
      open={isModalOpen}
      size="lg"
      selectorPrimaryFocus=".advanced-search-body"
    >
      <ModalHeader title="Advanced search" closeModal={onClose} />
      <ModalBody className="advanced-search-body">
        <Grid className="advanced-search-grid">
          <Column sm={4} md={8} lg={16}>
            <SearchInput
              id="advanced-search-input"
              label="Search by RU No. or Block ID"
              placeholder="Search by RU No. or Block ID"
              value={filters.mainSearchTerm ?? ''}
              onChange={onChange('mainSearchTerm')}
            />
          </Column>

          <Column sm={4} md={8} lg={16}>
            <CheckboxGroup legendText="Reporting unit filters" orientation="horizontal">
              <Checkbox
                id="created-by-me-checkbox"
                data-testid="created-by-me-checkbox"
                labelText="RUs created by me"
                checked={filters.requestByMe || false}
                onChange={onCheckBoxChange('requestByMe')}
              />
            </CheckboxGroup>
          </Column>

          <Column sm={4} md={4} lg={8}>
            <ActiveMultiSelect
              placeholder="Sampling"
              titleText="Sampling Option"
              id="sampling-multi-select"
              items={samplingOptions}
              itemToString={(item) =>
                item ? `${item.code} - ${item.description}` : 'No selection'
              }
              onChange={onActiveMultiSelectChange('sampling')}
              selectedItems={(samplingOptions ?? []).filter((option) =>
                (filters.sampling || []).includes(option.code),
              )}
            />
          </Column>

          <Column sm={4} md={4} lg={8}>
            <ActiveMultiSelect
              placeholder="District"
              titleText="District"
              id="district-multi-select"
              items={districtOptions}
              itemToString={(item) =>
                item ? `${item.code} - ${item.description}` : 'No selection'
              }
              onChange={onActiveMultiSelectChange('district')}
              selectedItems={(districtOptions ?? []).filter((option) =>
                (filters.district || []).includes(option.code),
              )}
            />
          </Column>

          <Column sm={4} md={4} lg={8}>
            <ActiveMultiSelect
              placeholder="Status"
              titleText="Status"
              id="status-multi-select"
              items={statusOptions}
              itemToString={(item) =>
                item ? `${item.code} - ${item.description}` : 'No selection'
              }
              onChange={onActiveMultiSelectChange('status')}
              selectedItems={(statusOptions ?? []).filter((option) =>
                (filters.status || []).includes(option.code),
              )}
            />
          </Column>

          {/* Client and location code */}
          <Column sm={4} md={4} lg={8} className="group-together">
            <AutoCompleteInput
              id="forestclient-client-ac"
              titleText="Client"
              placeholder="Search by client name, number, or acronym"
              onAutoCompleteChange={async (value) =>
                await APIs.forestclient.searchForestClients(value, 0, 10)
              }
              itemToString={(item) =>
                item
                  ? `${(item as ForestClientAutocompleteResultDto).id} ${(item as ForestClientAutocompleteResultDto).name} (${(item as ForestClientAutocompleteResultDto).acronym})`
                  : ''
              }
              onSelect={(data) => {
                if (data) {
                  onChange('clientNumber')((data as ForestClientAutocompleteResultDto).id || '');
                }
              }}
            />
            <ComboBox
              id="forestclient-location-cb"
              titleText="Location code"
              items={locationData ?? []}
              itemToString={(item) => (item ? `${item.code} - ${item.description}` : '')}
              onChange={(data) => {
                if (data && data.selectedItem) {
                  onChange('clientLocationCode')(
                    (data.selectedItem as CodeDescriptionDto).code || '',
                  );
                }
              }}
              disabled={!filters.clientNumber}
            />
          </Column>
          <Column sm={4} md={4} lg={8}>
            <div className="date-filter-container">
              {/* Start date */}
              <DatePicker
                className="advanced-date-picker"
                datePickerType="single"
                dateFormat="Y/m/d"
                allowInput
                maxDate={getStartMaxDate(filters.updateDateStart)}
                onChange={handleDateChange(true)}
                value={getStartDateValue(filters.updateDateStart)}
              >
                <DatePickerInput
                  data-testid="start-date-picker-input-id"
                  id="start-date-picker-input-id"
                  size="md"
                  labelText="Start Date"
                  placeholder="yyyy/mm/dd"
                />
              </DatePicker>
              {/* End date */}
              <DatePicker
                className="advanced-date-picker"
                datePickerType="single"
                dateFormat="Y/m/d"
                allowInput
                minDate={getEndMinDate(filters.updateDateEnd)}
                maxDate={DateTime.now().toFormat(DATE_PICKER_FORMAT)}
                onChange={handleDateChange(false)}
                value={getEndDateValue(filters.updateDateEnd)}
              >
                <DatePickerInput
                  data-testid="end-date-picker-input-id"
                  id="end-date-picker-input-id"
                  size="md"
                  labelText="End Date"
                  placeholder="yyyy/mm/dd"
                />
              </DatePicker>
            </div>
          </Column>

          {/* Submitter. Requires #77 to implement */}
          <Column sm={4} md={4} lg={8}></Column>

          {/* License number */}
          <Column sm={4} md={4} lg={8}>
            <TextInput
              className="advanced-text-input"
              id="license-number-text-input"
              type="text"
              labelText="License number"
              value={filters.licenseeId}
              onBlur={onTextChange('licenseeId')}
              maxLength={MAX_TEXT_INPUT_LEN}
            />
          </Column>

          {/* Cutting permit */}
          <Column sm={4} md={4} lg={4}>
            <TextInput
              className="advanced-text-input"
              id="cutting-permit-text-input"
              type="text"
              labelText="Cutting permit"
              value={filters.cuttingPermitId}
              onBlur={onTextChange('cuttingPermitId')}
              maxLength={MAX_TEXT_INPUT_LEN}
            />
          </Column>

          {/* Timber mark */}
          <Column sm={4} md={4} lg={4}>
            <TextInput
              className="advanced-text-input"
              id="timber-mark-text-input"
              data-testid="timber-mark-text-input"
              type="text"
              labelText="Timber mark"
              defaultValue={filters.timberMark}
              onBlur={onTextChange('timberMark')}
              maxLength={MAX_TEXT_INPUT_LEN}
            />
          </Column>
        </Grid>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" data-testid="modal-cancel-button" onClick={onClose}>
          Cancel
        </Button>
        <Button
          id="modal-search-button-most"
          className="search-button"
          renderIcon={SearchIcon}
          iconDescription="Search"
          type="button"
          size="lg"
          onClick={onSearch}
        >
          Search
        </Button>
      </ModalFooter>
    </ComposedModal>
  );
};

export default WasteSearchFiltersAdvanced;
