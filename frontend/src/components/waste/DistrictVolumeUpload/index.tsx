import {
  Button,
  Column,
  DatePicker,
  DatePickerInput,
  RadioButton,
  RadioButtonGroup,
} from '@carbon/react';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { DateTime } from 'luxon';
import { useCallback, useState, type FC } from 'react';

import type { CoastData, InteriorData, TableData } from '@/services/districtvolumes.types';

import FileUploadInput from '@/components/Form/FileUploadInput';
import { useDistrictVolumeTableCreateMutation } from '@/config/react-query/hooks';
import { navigateInTree } from '@/routes/inTreePaths';
import { DistrictVolumeProcessor } from '@/services/districtvolumes/processors/districtVolumeProcessor';
import { coastValidator } from '@/services/districtvolumes/validators/coastValidator';
import { interiorValidator } from '@/services/districtvolumes/validators/interiorValidator';
import { ExcelReader } from '@/services/spreadsheet/excelReader';
import { runValidators } from '@/utils/runValidators';
import { required } from '@/utils/validators';

import './index.scss';

/** Constant for date format used across the form. */
const DATE_FORMAT = 'yyyy-MM-dd' as const;

/** Singleton processor for district volume file parsing. */
const processor = new DistrictVolumeProcessor();

/**
 * Form component for uploading a new district volume table.
 *
 * Provides a structured form workflow to:
 * - Select an area type (Coastal or Interior) via radio buttons
 * - Choose a start date via date picker (must be tomorrow)
 * - Upload a .xlsx file processed by the district volume processor
 *
 * On successful submission, the user is navigated to the details page
 * of the newly created table. Form validation is enforced on blur and
 * change events for all required fields.
 *
 * The form uses `@tanstack/react-form` for state management and validation,
 * and `useDistrictVolumeTableCreateMutation` for the API call.
 *
 * @returns A Column wrapper containing the form with area selection,
 *   date picker, file upload input, and action buttons.
 *
 * @example
 * // Render the district volume upload form
 * <DistrictVolumeTableUpload />
 */
const DistrictVolumeTableUpload: FC = () => {
  const navigate = useNavigate();
  const createMutation = useDistrictVolumeTableCreateMutation({
    notificationTarget: 'upload-table',
    onSuccess: (tableId) => {
      // Navigate to the details page of the newly created table
      navigateInTree(navigate, `/configuration/district-volume-tables/${tableId}`);
    },
  });

  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      area: 'INTERIOR' as 'INTERIOR' | 'COASTAL',
      startDate: DateTime.now().plus({ days: 1 }).toFormat(DATE_FORMAT),
      tableLevelFactor: 0,
      heliMultiplier: 1,
      tableData: { type: 'INTERIOR', zones: [], formulas: {} } as InteriorData | CoastData,
    },
    onSubmit: async ({ value }) => {
      const data = value.tableData;
      if (data.type === 'INTERIOR') {
        if (!data.zones || data.zones.length === 0) {
          throw new Error('Please upload a valid Interior spreadsheet file');
        }
        await createMutation.mutateAsync({
          area: 'INTERIOR' as const,
          startDate: value.startDate,
          tableLevelFactor: value.tableLevelFactor,
          tableData: data,
        });
      } else {
        if (!data.sections || data.sections.length === 0) {
          throw new Error('Please upload a valid Coast spreadsheet file');
        }
        await createMutation.mutateAsync({
          area: 'COASTAL' as const,
          startDate: value.startDate,
          tableLevelFactor: value.tableLevelFactor,
          heliMultiplier: value.heliMultiplier,
          tableData: data,
        });
      }
    },
  });

  const resetUploadedTableData = useCallback(
    (
      selectedArea: 'INTERIOR' | 'COASTAL' = form.getFieldValue('area') as 'INTERIOR' | 'COASTAL',
    ) => {
      const clearedData =
        selectedArea === 'COASTAL'
          ? ({ type: 'COASTAL', sections: [], formulas: {} } as CoastData)
          : ({ type: 'INTERIOR', zones: [], formulas: {} } as InteriorData);

      form.setFieldValue('tableData', clearedData);
      form.setFieldValue('heliMultiplier', 1);
    },
    [form],
  );

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
   * Validates that the uploaded file type matches the currently selected area.
   * If the file type does not match the selected area, sets a file-level error
   * and rejects the file without updating form state.
   * Otherwise, updates the form's `area` and `tableData` fields to match the parsed file.
   * For Coastal files, also reads the heli multiplier extracted from the spreadsheet.
   *
   * @param results - Array of parsed table data returned by the file processor.
   */
  const handleFileChange = useCallback(
    async (results: TableData[]) => {
      if (results.length === 0) return;

      const data = results[0];
      if (!data) return;

      // Check for area/file type mismatch
      const currentArea = form.getFieldValue('area');
      if (currentArea !== data.type) {
        const areaLabel = currentArea === 'INTERIOR' ? 'Interior' : 'Coast';
        const fileTypeLabel = data.type === 'COASTAL' ? 'Coast' : 'Interior';
        setFileErrors([
          `Area mismatch: "${areaLabel}" is selected, but the uploaded file is a "${fileTypeLabel}" spreadsheet. ` +
            `Please select "${fileTypeLabel}" as the area or upload a "${areaLabel}" spreadsheet instead.`,
        ]);
        resetUploadedTableData(currentArea);
        return;
      }

      setFileErrors([]);
      form.setFieldValue('area', data.type);
      form.setFieldValue('tableData', data);

      if (data.type === 'COASTAL') {
        form.setFieldValue('heliMultiplier', processor.heliMultiplier ?? 1);
      }
    },
    [form, resetUploadedTableData],
  );

  /**
   * Handles the Carbon DatePicker `onChange` callback.
   * Validates that the selected date is tomorrow or later (the only allowed start dates)
   * and updates the form field accordingly; clears the value when the selection is invalid.
   *
   * @param dates - Array of selected dates from the date picker (empty when cleared).
   */
  const handleStartDateChange = useCallback(
    (dates: Date[]) => {
      const selected = dates[0] ? DateTime.fromJSDate(dates[0]) : undefined;
      const tomorrow = DateTime.now().plus({ days: 1 }).startOf('day');

      if (!selected || selected < tomorrow) {
        form.setFieldValue('startDate', '');
        return;
      }

      form.setFieldValue('startDate', selected.toFormat(DATE_FORMAT));
    },
    [form],
  );

  /**
   * Navigates the user back to the district volume tables list page.
   */
  const handleCancel = useCallback(() => {
    navigateInTree(navigate, '/configuration/district-volume-tables');
  }, [navigate]);

  return (
    <Column
      max={4}
      xlg={4}
      lg={4}
      md={4}
      sm={4}
      className="district-volume-upload-column__content"
      data-testid="district-volume-upload-column"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
      >
        <form.Field
          name="area"
          validators={{
            onBlurAsync: async ({ value }) =>
              runValidators(value, [required('Area type is required')]),
            onChangeAsync: async ({ value }) =>
              runValidators(value, [required('Area type is required')]),
          }}
        >
          {(field) => (
            <div className="form-field">
              <RadioButtonGroup
                data-testid="area-radio-group"
                name="area"
                legendText="Area"
                defaultSelected="INTERIOR"
                invalid={field.state.meta.isTouched && !!field.state.meta.errors.length}
                invalidText={field.state.meta.errors[0] ?? undefined}
                valueSelected={field.state.value ?? 'INTERIOR'}
                onChange={(
                  _selection: string | number | undefined,
                  _name: string,
                  _event: React.ChangeEvent<HTMLInputElement>,
                ) => {
                  const value = (_selection as 'INTERIOR' | 'COASTAL') ?? 'INTERIOR';
                  field.handleChange(value);
                }}
                onBlur={field.handleBlur}
              >
                <RadioButton labelText="Coast" value="COASTAL" id="area-coast" />
                <RadioButton labelText="Interior" value="INTERIOR" id="area-interior" />
              </RadioButtonGroup>
            </div>
          )}
        </form.Field>

        <form.Field
          name="startDate"
          validators={{
            onBlurAsync: async ({ value }) =>
              runValidators(value, [
                required('Start date is required'),
                (v) => {
                  if (typeof v !== 'string') return 'Start date must be a valid date';
                  const date = DateTime.fromFormat(v, DATE_FORMAT);
                  if (!date.isValid) return 'Start date must be a valid date';
                  const tomorrow = DateTime.now().plus({ days: 1 }).startOf('day');
                  if (date < tomorrow) return 'Start date must be tomorrow or later';
                  return undefined;
                },
              ]),
            onChangeAsync: async ({ value }) =>
              runValidators(value, [
                required('Start date is required'),
                (v) => {
                  if (typeof v !== 'string') return 'Start date must be a valid date';
                  const date = DateTime.fromFormat(v, DATE_FORMAT);
                  if (!date.isValid) return 'Start date must be a valid date';
                  const tomorrow = DateTime.now().plus({ days: 1 }).startOf('day');
                  if (date < tomorrow) return 'Start date must be tomorrow or later';
                  return undefined;
                },
              ]),
          }}
        >
          {(field) => (
            <div className="form-field">
              <DatePicker
                datePickerType="single"
                dateFormat="Y/m/d"
                allowInput
                minDate={DateTime.now().plus({ days: 1 }).toFormat(DATE_FORMAT)}
                onChange={handleStartDateChange}
                value={
                  field.state.value
                    ? [DateTime.fromFormat(field.state.value, DATE_FORMAT).toJSDate()]
                    : []
                }
              >
                <DatePickerInput
                  id="start-date-picker"
                  data-testid="start-date-picker"
                  labelText="Start date"
                  placeholder="yyyy/mm/dd"
                  invalid={field.state.meta.isTouched && !!field.state.meta.errors.length}
                  invalidText={field.state.meta.errors[0] ?? undefined}
                />
              </DatePicker>
            </div>
          )}
        </form.Field>

        <FileUploadInput
          accept=".xlsx"
          maxFileSizeBytes={2 * 1024 * 1024}
          processor={processor}
          validator={async (file: File) => {
            try {
              const reader = new ExcelReader();
              const sheets = await reader.listSheets(file);
              const upperSheets = sheets.map((s) => s.trim().toUpperCase());

              // Detect the file type from sheet names
              const detectedType = upperSheets.some((sheet) => sheet.includes('COAST'))
                ? 'COASTAL'
                : upperSheets.some((sheet) => sheet.includes('INTERIOR'))
                  ? 'INTERIOR'
                  : null;

              if (detectedType) {
                // Check for area/file type mismatch before format validation
                const currentArea = form.getFieldValue('area');
                if (currentArea !== detectedType) {
                  resetUploadedTableData(currentArea);
                  const areaLabel = currentArea === 'INTERIOR' ? 'Interior' : 'Coast';
                  const fileTypeLabel = detectedType === 'COASTAL' ? 'Coast' : 'Interior';
                  return [
                    `Area mismatch: "${areaLabel}" is selected, but the uploaded file is a "${fileTypeLabel}" spreadsheet. ` +
                      `Please select "${fileTypeLabel}" as the area or upload a "${areaLabel}" spreadsheet instead.`,
                  ];
                }

                // Area matches — proceed with format validation
                const validationErrors =
                  detectedType === 'COASTAL'
                    ? await coastValidator(file)
                    : await interiorValidator(file);

                if (validationErrors.length > 0) {
                  resetUploadedTableData(currentArea);
                }

                return validationErrors;
              }

              resetUploadedTableData(form.getFieldValue('area'));
              return [
                'Could not detect spreadsheet format. Expected a sheet named "Interior" or "Coast".',
              ];
            } catch (e) {
              resetUploadedTableData(form.getFieldValue('area'));
              return [(e as Error).message];
            }
          }}
          onProcessed={handleFileChange}
          externalErrors={fileErrors}
        />

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
                disabled={!canSubmit || createMutation.isPending || isSubmitting}
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

export default DistrictVolumeTableUpload;
