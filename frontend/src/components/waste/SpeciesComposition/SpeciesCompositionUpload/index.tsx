import { Column, DatePicker, DatePickerInput, Grid } from '@carbon/react';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { DateTime } from 'luxon';
import { useCallback, useState, type FC } from 'react';

import SpeciesCompositionReviewTable from './SpeciesCompositionReviewTable';

import type {
  SpeciesCompositionCreate,
  SpeciesCompositionData,
} from '@/services/speciesComposition.types';

import FileUploadInput from '@/components/Form/FileUploadInput';
import UploadFormActions from '@/components/waste/UploadFormActions';
import { useSpeciesCompositionCreateMutation } from '@/config/react-query/hooks';
import { navigateInTree } from '@/routes/inTreePaths';
import { SpeciesCompositionProcessor } from '@/services/speciescomposition/processors/speciesCompositionProcessor';
import { speciesCompositionValidator } from '@/services/speciescomposition/validators/speciesCompositionValidator';

import './index.scss';

/** Constant for date format used across the form. */
const DATE_FORMAT = 'yyyy-MM-dd' as const;

/** Singleton processor for species composition file parsing. */
const processor = new SpeciesCompositionProcessor();

/**
 * Form component for uploading a new species composition table.
 *
 * Provides a structured form workflow to:
 * - Upload a .xls or .xlsx file processed by the species composition processor
 * - Confirm and submit the data via the create mutation
 *
 * On successful submission, the user is navigated to the details page
 * of the newly created table.
 *
 * The form uses `@tanstack/react-form` for state management and
 * `useSpeciesCompositionCreateMutation` for the API call.
 *
 * @returns A Column wrapper containing the form with file upload
 *   and action buttons, using a Grid for responsive layout.
 */
const SpeciesCompositionUpload: FC = () => {
  const navigate = useNavigate();
  const createMutation = useSpeciesCompositionCreateMutation({
    notificationTarget: 'species-composition-upload',
    onSuccess: (tableId) => {
      navigateInTree(navigate, `/configuration/species-composition/${tableId}`);
    },
  });

  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  const form = useForm({
    defaultValues: {
      startDate: DateTime.now().plus({ days: 1 }).toFormat(DATE_FORMAT),
      tableData: { rows: [] } as SpeciesCompositionData,
    },
    onSubmit: async ({ value }) => {
      const data = value.tableData;
      if (!data.rows || data.rows.length === 0) {
        throw new Error('Please upload a valid species composition spreadsheet file');
      }

      if (!isReviewing) {
        setIsReviewing(true);
        return;
      }

      const createPayload: SpeciesCompositionCreate = {
        area: 'INTERIOR',
        startDate: value.startDate,
        tableLevelFactor: 0,
        heliMultiplier: 0,
        tableData: {
          type: 'SPECIES_COMPOSITION',
          rows: data.rows,
        },
      };
      await createMutation.mutateAsync(createPayload);
    },
  });

  /**
   * Handles form submission by clearing any prior error and invoking the TanStack form submit.
   * Catches validation or mutation errors and surfaces them as an inline error message.
   */
  const handleSubmit = useCallback(() => {
    setSubmitError(null);
    form.handleSubmit().catch((err: unknown) => {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
    });
  }, [form]);

  /**
   * Processes the results emitted by {@link FileUploadInput} after the spreadsheet is parsed.
   * Updates the form's `tableData` field with the parsed rows.
   *
   * @param results - Array of parsed species composition data returned by the file processor.
   */
  const handleFileChange = useCallback(
    async (results: SpeciesCompositionData[]) => {
      if (results.length === 0) return;

      const data = results[0];
      if (!data) return;

      setFileErrors([]);
      form.setFieldValue('tableData', data);
    },
    [form],
  );

  /**
   * Navigates the user back to the species composition list page.
   */
  const handleCancel = useCallback(() => {
    navigateInTree(navigate, '/configuration/species-composition');
  }, [navigate]);

  const handleBackToUpload = useCallback(() => {
    setSubmitError(null);
    setIsReviewing(false);
  }, []);

  const tableData = form.state.values.tableData;
  const hasRows = tableData.rows.length > 0;

  return (
    <>
      <Column
        max={16}
        xlg={16}
        lg={16}
        md={8}
        sm={4}
        className="species-composition-upload__content"
        data-testid="species-composition-upload-column"
      >
        <form
          data-testid="species-composition-upload-form"
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSubmit();
          }}
        >
          <Grid>
            {isReviewing ? (
              <Column max={16} xlg={16} lg={16} md={8} sm={4}>
                <SpeciesCompositionReviewTable
                  rows={tableData.rows}
                  data-testid="species-composition-review-table"
                />
              </Column>
            ) : (
              <>
                <Column max={16} xlg={16} lg={16} md={8} sm={4}>
                  <form.Field name="startDate">
                    {(field) => (
                      <div className="form-field">
                        <DatePicker
                          datePickerType="single"
                          dateFormat="Y/m/d"
                          allowInput
                          minDate={DateTime.now().plus({ days: 1 }).toFormat(DATE_FORMAT)}
                          onChange={([selected]) => {
                            if (selected) {
                              field.handleChange(
                                DateTime.fromJSDate(selected).toFormat(DATE_FORMAT),
                              );
                            }
                          }}
                          value={
                            field.state.value
                              ? [DateTime.fromFormat(field.state.value, DATE_FORMAT).toJSDate()]
                              : []
                          }
                        >
                          <DatePickerInput
                            id="start-date-picker"
                            data-testid="start-date-picker"
                            labelText="Set start date"
                            placeholder="mm/dd/yyyy"
                            invalid={field.state.meta.isTouched && !!field.state.meta.errors.length}
                            invalidText={field.state.meta.errors[0] ?? undefined}
                          />
                        </DatePicker>
                      </div>
                    )}
                  </form.Field>
                </Column>
                <Column max={6} xlg={6} lg={6} md={8} sm={4}>
                  <FileUploadInput
                    accept=".xls,.xlsx"
                    maxFileSizeBytes={2 * 1024 * 1024}
                    processor={processor}
                    validator={speciesCompositionValidator}
                    onProcessed={handleFileChange}
                    externalErrors={fileErrors}
                  />
                </Column>
                <Column max={10} xlg={10} lg={10} md={0} sm={0}></Column>
              </>
            )}
          </Grid>
          <UploadFormActions
            form={form}
            isReviewing={isReviewing}
            isMutationPending={createMutation.isPending}
            hasData={hasRows}
            onSubmit={handleSubmit}
            onBack={handleBackToUpload}
            onCancel={handleCancel}
          />
        </form>
      </Column>

      {submitError && (
        <div className="form-field--error" role="alert" data-testid="submit-error">
          {submitError}
        </div>
      )}
    </>
  );
};

export default SpeciesCompositionUpload;
