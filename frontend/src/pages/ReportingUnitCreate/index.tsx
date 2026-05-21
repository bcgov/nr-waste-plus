import { Button, Column, ComboBox } from '@carbon/react';
import { useForm } from '@tanstack/react-form';
import { type FC } from 'react';

import { runValidators } from './runValidators';
import { required } from './validators';

import type { CodeDescriptionDto } from '@/services/types';

import PageTitle from '@/components/core/PageTitle';
import { useWasteSearchFilterOptions } from '@/components/waste/WasteSearch/WasteSearchFilters/useWasteSearchFilterOptions';
import { activeMSItemToString } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';
import AdvancedFilterClientInput from '@/components/waste/WasteSearch/WasteSearchFiltersAdvanced/AdvancedFilterClientInput';

import './index.scss';
import { Add } from '@carbon/icons-react';

type ReportingUnitCreateDto = {
  clientNumber: string | null;
  districtCode: string | null;
  samplingCode: string | null;
};

const ReportingUnitCreatePage: FC = () => {
  const { samplingOptions, districtOptions } = useWasteSearchFilterOptions();

  const form = useForm({
    defaultValues: {
      clientNumber: null as ReportingUnitCreateDto['clientNumber'],
      districtCode: null as ReportingUnitCreateDto['districtCode'],
      samplingCode: null as ReportingUnitCreateDto['samplingCode'],
    },
    onSubmit: ({ value }) => {
      // call reporting unit create tanstack query here, then navigate IF we receive a 201 with location header
      console.log('Form submitted with values:', value);
    },
  });

  const findSelectedItem = (
    options: CodeDescriptionDto[] | undefined,
    value: string | null,
  ): CodeDescriptionDto | null => {
    if (!options || value == null) return null;
    return options.find((o) => o.code === value) ?? null;
  };

  const createComboBoxOnChange =
    (handleChange: (value: string | null) => void) =>
    (event: { selectedItem?: CodeDescriptionDto | null }) => {
      handleChange(event.selectedItem?.code ?? null);
    };

  return (
    <>
      <Column lg={16} md={8} sm={4} className="create-ru-column__banner">
        <PageTitle
          title="Create reporting unit"
          subtitle="Start a new waste submission by creating a reporting unit."
        />
      </Column>

      <Column max={6} xlg={6} lg={6} md={4} sm={4} className="create-ru-column__content">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <form.Field
            name="clientNumber"
            validators={{
              onBlurAsync: async ({ value }) =>
                runValidators(value, [required('Please select a client')]),
              onChangeAsync: async ({ value }) =>
                runValidators(value, [required('Please select a client')]),
            }}
          >
            {(field) => (
              <AdvancedFilterClientInput
                selectedClients={
                  field.state.value ? [{ code: field.state.value, description: '' }] : []
                }
                myClients={[]}
                onClientChange={(changes) =>
                  field.handleChange(changes.selectedItems[0]?.code ?? null)
                }
              />
            )}
          </form.Field>

          <form.Field
            name="districtCode"
            validators={{
              onBlurAsync: async ({ value }) =>
                runValidators(value, [required('Please select a district')]),
              onChangeAsync: async ({ value }) =>
                runValidators(value, [required('Please select a district')]),
            }}
          >
            {(field) => (
              <ComboBox
                placeholder="District"
                titleText="District"
                id="create-ru-district"
                items={districtOptions ?? []}
                itemToString={(option) => activeMSItemToString(option, '')}
                onBlur={field.handleBlur}
                onChange={createComboBoxOnChange(field.handleChange)}
                selectedItem={findSelectedItem(districtOptions, field.state.value)}
                invalid={field.state.meta.isTouched && !!field.state.meta.errors.length}
                invalidText={field.state.meta.errors[0]}
              />
            )}
          </form.Field>
          <form.Field
            name="samplingCode"
            validators={{
              onBlurAsync: async ({ value }) =>
                runValidators(value, [required('Please select a sampling option')]),
              onChangeAsync: async ({ value }) =>
                runValidators(value, [required('Please select a sampling option')]),
            }}
          >
            {(field) => (
              <ComboBox
                placeholder="Sampling option"
                titleText="Sampling option"
                id="as-sampling-multi-select"
                items={samplingOptions}
                itemToString={(option) => activeMSItemToString(option, '')}
                onBlur={field.handleBlur}
                onChange={createComboBoxOnChange(field.handleChange)}
                selectedItem={findSelectedItem(samplingOptions, field.state.value)}
                invalid={field.state.meta.isTouched && !!field.state.meta.errors.length}
                invalidText={field.state.meta.errors[0]}
              />
            )}
          </form.Field>
          <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
            {([canSubmit, isSubmitting]) => (
              <Button
                kind="primary"
                onClick={() => form.handleSubmit()}
                renderIcon={Add}
                disabled={!canSubmit}
                className="create-ru-submit-button"
              >
                Create
                {isSubmitting && <span className="create-ru-submitting-text">Submitting...</span>}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </Column>
      <Column max={10} xlg={10} lg={10} md={4} sm={0} className="create-ru-column__spacer"></Column>
    </>
  );
};

export default ReportingUnitCreatePage;
