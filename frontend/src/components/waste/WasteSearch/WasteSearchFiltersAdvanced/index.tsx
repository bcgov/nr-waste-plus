import { Search as SearchIcon } from '@carbon/icons-react';
import {
  Button,
  Checkbox,
  CheckboxGroup,
  Column,
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

import ActiveMultiSelect from '@/components/Form/ActiveMultiSelect';
import AutoCompleteInput from '@/components/Form/AutoCompleteInput';
import { activeMSItemToString } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';
import { useAuth } from '@/context/auth/useAuth';
import APIs from '@/services/APIs';

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
  ) => (value: string | CodeDescriptionDto[] | boolean | string[]) => void;
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
  const auth = useAuth();

  const onCheckBoxChange =
    (key: keyof ReportingUnitSearchParametersDto) =>
    (_: React.ChangeEvent<HTMLInputElement>, data: { checked: boolean; id: string }) => {
      onChange(key)(data.checked);
    };

  const onActiveMultiSelectChange =
    (key: keyof ReportingUnitSearchParametersDto) =>
    (changes: { selectedItems: CodeDescriptionDto[] }): void => {
      onChange(key)(changes.selectedItems?.map((item) => item.code));
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

  const { data: myClients } = useQuery({
    queryKey: ['search', 'my-forest-client', { page: 0, size: auth.getClients().length || 10 }],
    queryFn: () => APIs.forestclient.searchMyForestClients('', 0, auth.getClients().length || 10),
    enabled: auth.user?.idpProvider !== 'IDIR',
    gcTime: 0,
    staleTime: Infinity,
    select: (data) => data.content.map((item) => item.client),
  });

  if (!isModalOpen) return null;

  return (
    <ComposedModal
      className="advanced-search-modal"
      data-testid="advanced-search-modal"
      open={isModalOpen}
      onClose={onClose}
      size="lg"
      selectorPrimaryFocus=".advanced-search-body"
    >
      <ModalHeader title="Advanced search" closeModal={onClose} />
      <ModalBody className="advanced-search-body">
        <Grid className="advanced-search-grid">
          {/* Block ID or Reporting Unit No. */}
          <Column sm={4} md={4} lg={8}>
            <TextInput
              className="advanced-text-input"
              id="as-ru-or-block-text-input"
              data-testid="ru-or-block-text-input"
              type="text"
              labelText="Block ID or Reporting Unit No."
              defaultValue={filters.mainSearchTerm ?? ''}
              onBlur={onTextChange('mainSearchTerm')}
              maxLength={MAX_TEXT_INPUT_LEN}
            />
          </Column>

          {/* District */}
          <Column sm={4} md={4} lg={8}>
            <ActiveMultiSelect
              placeholder="District"
              titleText="District"
              id="as-district-multi-select"
              items={districtOptions ?? []}
              itemToString={activeMSItemToString}
              onChange={onActiveMultiSelectChange('district')}
              selectedItems={(districtOptions ?? []).filter((option) =>
                (filters.district || []).includes(option.code),
              )}
            />
          </Column>

          {/* Sampling option */}
          <Column sm={4} md={4} lg={8}>
            <ActiveMultiSelect
              placeholder="Sampling Option"
              titleText="Sampling Option"
              id="as-sampling-multi-select"
              items={samplingOptions}
              itemToString={activeMSItemToString}
              onChange={onActiveMultiSelectChange('sampling')}
              selectedItems={(samplingOptions ?? []).filter((option) =>
                (filters.sampling || []).includes(option.code),
              )}
            />
          </Column>

          {/* Status */}
          <Column sm={4} md={4} lg={8}>
            <ActiveMultiSelect
              placeholder="Status"
              titleText="Status"
              id="as-status-multi-select"
              items={statusOptions}
              itemToString={activeMSItemToString}
              onChange={onActiveMultiSelectChange('status')}
              selectedItems={(statusOptions ?? []).filter((option) =>
                (filters.status || []).includes(option.code),
              )}
            />
          </Column>

          {/* Client Autocomplete or Select */}
          <Column sm={4} md={4} lg={8}>
            {auth.user?.idpProvider === 'IDIR' && (
              <AutoCompleteInput<ForestClientAutocompleteResultDto>
                id="as-forestclient-client-ac"
                titleText="Client"
                placeholder="Search by client name, number, or acronym"
                helperText="Search by client name, number or acronym"
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
                    onChange('clientNumbers')([
                      (data as ForestClientAutocompleteResultDto).id || '',
                    ]);
                  }
                }}
              />
            )}
            {auth.user?.idpProvider === 'BCEIDBUSINESS' && (
              <ActiveMultiSelect
                placeholder="Client"
                titleText="Client"
                id="as-client-multi-select"
                items={myClients ?? []}
                itemToString={activeMSItemToString}
                onChange={onActiveMultiSelectChange('clientNumbers')}
                selectedItems={(myClients ?? []).filter((option) =>
                  (filters.clientNumbers || []).includes(option.code),
                )}
              />
            )}
          </Column>

          {/* Submitter */}
          <Column sm={4} md={4} lg={8}>
            <AutoCompleteInput<string>
              id="as-submitter-name-ac"
              titleText="IDIR or BCeID"
              onAutoCompleteChange={async (value) =>
                await APIs.search.searchReportingUnitUsers(value)
              }
              itemToString={(item) => {
                if (typeof item === 'string') return item;
                if (item && typeof item === 'object') {
                  // Detect if it's a character-indexed object
                  const values = Object.values(item);
                  if (values.every((char) => typeof char === 'string' && char.length === 1)) {
                    return values.join('');
                  }
                }
                return '';
              }}
              onSelect={(data) => {
                if (data) {
                  onChange('requestUserId')((data as string) || '');
                }
              }}
            />
          </Column>

          {/* Date range pickers */}
          <Column sm={4} md={4} lg={8}>
            <div className="date-filter-container">
              {/* Start date */}
              <DatePicker
                className="advanced-date-picker"
                datePickerType="single"
                dateFormat="Y/m/d"
                locale="en"
                allowInput
                maxDate={getStartMaxDate(filters.updateDateStart)}
                onChange={handleDateChange(true)}
                value={getStartDateValue(filters.updateDateStart)}
              >
                <DatePickerInput
                  data-testid="start-date-picker-input-id"
                  id="as-start-date-picker-input-id"
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
                locale="en"
                allowInput
                minDate={getEndMinDate(filters.updateDateEnd)}
                maxDate={DateTime.now().toFormat(DATE_PICKER_FORMAT)}
                onChange={handleDateChange(false)}
                value={getEndDateValue(filters.updateDateEnd)}
              >
                <DatePickerInput
                  data-testid="end-date-picker-input-id"
                  id="as-end-date-picker-input-id"
                  size="md"
                  labelText="End Date"
                  placeholder="yyyy/mm/dd"
                />
              </DatePicker>
            </div>
          </Column>

          {/* License number */}
          <Column sm={4} md={4} lg={8}>
            <TextInput
              className="advanced-text-input"
              id="as-license-number-text-input"
              type="text"
              labelText="License number"
              defaultValue={filters.licenseeId || ''}
              onBlur={onTextChange('licenseeId')}
              maxLength={MAX_TEXT_INPUT_LEN}
            />
          </Column>

          {/* Cutting permit */}
          <Column sm={4} md={4} lg={8}>
            <TextInput
              className="advanced-text-input"
              id="as-cutting-permit-text-input"
              type="text"
              labelText="Cutting permit"
              defaultValue={filters.cuttingPermitId || ''}
              onBlur={onTextChange('cuttingPermitId')}
              maxLength={MAX_TEXT_INPUT_LEN}
            />
          </Column>

          {/* Timber mark */}
          <Column sm={4} md={4} lg={8}>
            <TextInput
              className="advanced-text-input"
              id="as-timber-mark-text-input"
              data-testid="timber-mark-text-input"
              type="text"
              labelText="Timber mark"
              defaultValue={filters.timberMark || ''}
              onBlur={onTextChange('timberMark')}
              maxLength={MAX_TEXT_INPUT_LEN}
            />
          </Column>

          <Column sm={4} md={8} lg={16}>
            <CheckboxGroup legendText="Reporting unit filters" orientation="horizontal">
              <Checkbox
                id="as-created-by-me-checkbox"
                data-testid="created-by-me-checkbox"
                labelText="RUs/Blocks submitted by me"
                checked={filters.requestByMe || false}
                onChange={onCheckBoxChange('requestByMe')}
              />
              <Checkbox
                id="as-multimark-checkbox"
                data-testid="multimark-checkbox"
                labelText="Multi-mark blocks only"
                checked={filters.multiMark || false}
                onChange={onCheckBoxChange('multiMark')}
              />
            </CheckboxGroup>
          </Column>
        </Grid>
      </ModalBody>
      <ModalFooter>
        <Button kind="secondary" data-testid="modal-cancel-button" onClick={onClose}>
          Cancel
        </Button>
        <Button
          id="as-modal-search-button-most"
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
