import { Add } from '@carbon/icons-react';
import { Button, Column, ComboBox, RadioButton, RadioButtonGroup } from '@carbon/react';
import { useForm } from '@tanstack/react-form';
import { useRouter } from '@tanstack/react-router';
import { type ChangeEvent, type FC } from 'react';

import ConditionalField from '@/components/Form/ConditionalField';
import { useWasteSearchFilterOptions } from '@/components/waste/WasteSearch/WasteSearchFilters/useWasteSearchFilterOptions';
import { activeMSItemToString } from '@/components/waste/WasteSearch/WasteSearchFiltersActive/utils';
import AdvancedFilterClientInput from '@/components/waste/WasteSearch/WasteSearchFiltersAdvanced/AdvancedFilterClientInput';
import {
  useMyForestClientsQuery,
  useReportingUnitCreateMutation,
} from '@/config/react-query/hooks';
import { useAuth } from '@/context/auth/useAuth';
import {
  type CodeDescriptionDto,
  type ReportingUnitCreateDto,
  reportingUnitCreateRequestSchema,
} from '@/services/types';
import { runValidators } from '@/utils/runValidators';
import { required } from '@/utils/validators';

import './index.scss';

/**
 * Form component for creating a new waste reporting unit.
 *
 * Provides a structured form workflow to:
 * - Select a client from the organization's client list
 * - Choose a reporting district (DKM, DCR, DPG)
 * - Optionally select grade type (Coastal or Interior) if DKM is selected
 * - Specify a sampling methodology option
 *
 * On successful submission, the user is navigated to the details page of the newly created reporting unit.
 * Form validation is enforced on blur and change events for all required fields.
 *
 * @returns A Column wrapper containing the form with client selection, district dropdown,
 *   conditional grade selection, and sampling option dropdown.
 *
 * @example
 * // Render the reporting unit creation form
 * <ReportingUnitCreate />
 */
const ReportingUnitCreate: FC = () => {
  const router = useRouter();
  const auth = useAuth();

  const { samplingOptions, districtOptions } = useWasteSearchFilterOptions();
  const createMutation = useReportingUnitCreateMutation({
    notificationTarget: 'create-ru',
    onSuccess: (ruId) => {
      // Navigate to the details page of the newly created reporting unit
      router.navigate({ to: `/reporting-units/${ruId}` });
    },
  });

  const form = useForm({
    defaultValues: {
      clientNumber: null as string | null,
      districtCode: null as string | null,
      samplingCode: 'AVG' as string | null,
      gradeCode: null as string | null,
    },
    onSubmit: async ({ value }) => {
      await createMutation.mutateAsync(value as ReportingUnitCreateDto);
    },
  });

  const { data: myClients } = useMyForestClientsQuery('', 0, auth.getClients().length || 10, {
    enabled: auth.user?.idpProvider !== 'IDIR',
    gcTime: 0,
    staleTime: Infinity,
    select: (data) => data.content.map((item) => item.client),
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
    <Column max={6} xlg={6} lg={6} md={4} sm={4} className="create-ru-column__content" data-testid="create-ru-column-content">
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
              runValidators(
                value,
                [required('Please select a client')],
                reportingUnitCreateRequestSchema.shape.clientNumber,
              ),
            onChangeAsync: async ({ value }) =>
              runValidators(
                value,
                [required('Please select a client')],
                reportingUnitCreateRequestSchema.shape.clientNumber,
              ),
          }}
        >
          {(field) => (
            <AdvancedFilterClientInput
              selectedClients={
                field.state.value ? [{ code: field.state.value, description: '' }] : []
              }
              onBlur={field.handleBlur}
              myClients={myClients ?? []}
              onClientChange={(changes) =>
                field.handleChange(changes.selectedItems[0]?.code ?? null)
              }
              invalid={field.state.meta.isTouched && !!field.state.meta.errors.length}
              invalidText={field.state.meta.errors[0]}
            />
          )}
        </form.Field>

        <form.Field
          name="districtCode"
          validators={{
            onBlurAsync: async ({ value }) =>
              runValidators(
                value,
                [required('You must select a district to proceed')],
                reportingUnitCreateRequestSchema.shape.districtCode,
              ),
            onChangeAsync: async ({ value }) =>
              runValidators(
                value,
                [required('You must select a district to proceed')],
                reportingUnitCreateRequestSchema.shape.districtCode,
              ),
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

        <ConditionalField
          form={form}
          conditions={{ field: 'districtCode', operator: 'equals', value: 'DKM' }}
          fieldNames={['gradeCode']}
        >
          <form.Field
            name="gradeCode"
            validators={{
              onBlurAsync: async ({ value }) =>
                runValidators(
                  value,
                  [required('You must select one option to proceed')],
                  reportingUnitCreateRequestSchema.shape.gradeCode,
                ),
              onChangeAsync: async ({ value }) =>
                runValidators(
                  value,
                  [required('You must select one option to proceed')],
                  reportingUnitCreateRequestSchema.shape.gradeCode,
                ),
            }}
          >
            {(field) => (
              <RadioButtonGroup
                defaultSelected=""
                invalid={field.state.meta.isTouched && !!field.state.meta.errors.length}
                invalidText={field.state.meta.errors[0]}
                value={field.state.value ?? ''}
                onChange={(
                  _selection: string | number | undefined,
                  _name: string,
                  event: ChangeEvent<HTMLInputElement>,
                ) => {
                  field.handleChange(event.target.value);
                }}
                onBlur={field.handleBlur}
                legendText="Select grades you will use"
                name="create-ru-grade"
                id="create-ru-grade"
              >
                <RadioButton
                  id="create-ru-grade-coastal"
                  labelText="Coastal grades"
                  value="COASTAL"
                />
                <RadioButton
                  id="create-ru-grade-interior"
                  labelText="Interior grades"
                  value="INTERIOR"
                />
              </RadioButtonGroup>
            )}
          </form.Field>
        </ConditionalField>

        <form.Field
          name="samplingCode"
          validators={{
            onBlurAsync: async ({ value }) =>
              runValidators(
                value,
                [required('You must select a sampling option to proceed')],
                reportingUnitCreateRequestSchema.shape.samplingCode,
              ),
            onChangeAsync: async ({ value }) =>
              runValidators(
                value,
                [required('You must select a sampling option to proceed')],
                reportingUnitCreateRequestSchema.shape.samplingCode,
              ),
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
              disabled={!canSubmit || createMutation.isPending}
              className="create-ru-submit-button"
            >
              Create
              {(isSubmitting || createMutation.isPending) && (
                <span className="create-ru-submitting-text">Submitting...</span>
              )}
            </Button>
          )}
        </form.Subscribe>
      </form>
    </Column>
  );
};

export default ReportingUnitCreate;
