import { Button, Column } from '@carbon/react';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { useCallback, useState, type FC } from 'react';

import SpeciesCompositionReviewTable from './SpeciesCompositionReviewTable';

import type {
  SpeciesCompositionCreate,
  SpeciesCompositionData,
} from '@/services/speciesComposition.types';

import FileUploadInput from '@/components/Form/FileUploadInput';
import { useSpeciesCompositionCreateMutation } from '@/config/react-query/hooks';
import { navigateInTree } from '@/routes/inTreePaths';
import { SpeciesCompositionProcessor } from '@/services/speciescomposition/processors/speciesCompositionProcessor';
import { speciesCompositionValidator } from '@/services/speciescomposition/validators/speciesCompositionValidator';

import './index.scss';

/** Singleton processor for species composition file parsing. */
const processor = new SpeciesCompositionProcessor();

/**
 * Form component for uploading a new species composition table.
 *
 * Provides a structured form workflow to:
 * - Upload a .xls or .xlsx file processed by the species composition processor
 * - Review parsed data in a table (districts × species columns)
 * - Confirm and submit the data via the create mutation
 *
 * On successful submission, the user is navigated to the details page
 * of the newly created table.
 *
 * The form uses `@tanstack/react-form` for state management and
 * `useSpeciesCompositionCreateMutation` for the API call.
 *
 * @returns A Column wrapper containing the form with file upload,
 *   review table, and action buttons.
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

  const form = useForm({
    defaultValues: {
      tableData: { rows: [] } as SpeciesCompositionData,
    },
    onSubmit: async ({ value }) => {
      const data = value.tableData;
      if (!data.rows || data.rows.length === 0) {
        throw new Error('Please upload a valid species composition spreadsheet file');
      }
      const createPayload: SpeciesCompositionCreate = {
        tableData: data,
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

  const tableData = form.state.values.tableData;
  const hasRows = tableData.rows.length > 0;

  return (
    <Column
      max={4}
      xlg={4}
      lg={4}
      md={4}
      sm={4}
      className="species-composition-upload__content"
      data-testid="species-composition-upload-column"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <FileUploadInput
          accept=".xls,.xlsx"
          maxFileSizeBytes={2 * 1024 * 1024}
          processor={processor}
          validator={speciesCompositionValidator}
          onProcessed={handleFileChange}
          externalErrors={fileErrors}
        />

        {hasRows && (
          <SpeciesCompositionReviewTable
            rows={tableData.rows}
            data-testid="species-composition-review-table"
          />
        )}

        {submitError && (
          <div className="form-field--error" role="alert" data-testid="submit-error">
            {submitError}
          </div>
        )}

        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit, isSubmitting]) => (
            <div className="button-group">
              <Button
                kind="secondary"
                type="button"
                onClick={handleCancel}
                data-testid="cancel-button"
              >
                Cancel
              </Button>
              <Button
                kind="primary"
                onClick={handleSubmit}
                disabled={!canSubmit || createMutation.isPending || isSubmitting || !hasRows}
                data-testid="upload-table-button"
              >
                Upload table
              </Button>
            </div>
          )}
        </form.Subscribe>
      </form>
    </Column>
  );
};

export default SpeciesCompositionUpload;
