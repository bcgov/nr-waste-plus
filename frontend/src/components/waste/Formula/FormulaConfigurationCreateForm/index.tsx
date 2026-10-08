import {
  Button,
  Column,
  Grid,
  RadioButtonGroup,
  RadioButton,
  DatePicker,
  DatePickerInput,
} from '@carbon/react';
import { useForm, useSelector } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { DateTime } from 'luxon';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';

import {
  useCreateFormulaSet,
  useCurrentOpenEndedFormulaSet,
  useFormulaVariables,
} from '@/api/formulaConfiguration';
import {
  FORMULA_KEYS,
  FORMULA_VARIABLES_DISTRICT_CODE,
  getFormulaKeysForArea,
} from '@/api/formulaConfiguration.constants.ts';
import FormulaSection from '@/components/waste/Formula/FormulaSection';
import { ApiError } from '@/config/api/types.ts';

import FormulaVariableCatalog from '../FormulaVariableCatalog';

import { carryForwardFormulaValues, type FormulaDraftValue } from './carryForward.ts';

import type {
  FormulaItemDto,
  FormulaSetRequest,
  FormulaValidationError,
} from '@/api/formulaConfiguration.types.ts';

import './index.scss';

const DATE_FORMAT = 'yyyy-MM-dd' as const;

/** RFC 7807 problem-detail body shape returned by the API for validation failures. */
interface ProblemDetailBody {
  readonly detail?: unknown;
  readonly validationErrors?: unknown;
}

/** Collects the `message` strings from a `validationErrors` problem-detail extension. */
const readValidationMessages = (validationErrors: unknown): string[] => {
  if (!Array.isArray(validationErrors)) {
    return [];
  }
  return validationErrors.flatMap((entry) => {
    if (entry === null || typeof entry !== 'object') {
      return [];
    }
    const errors = (entry as { readonly errors?: unknown }).errors;
    if (!Array.isArray(errors)) {
      return [];
    }
    return errors.flatMap((error) => {
      if (error === null || typeof error !== 'object') {
        return [];
      }
      const message = (error as { readonly message?: unknown }).message;
      return typeof message === 'string' && message.trim().length > 0 ? [message] : [];
    });
  });
};

/**
 * Converts a create-set failure into a user-facing message.
 *
 * API failures surface as {@link ApiError}; for a 422 the response body carries the
 * RFC 7807 `detail` (and optionally itemized `validationErrors`), which reads far better
 * in the alert than the raw status/JSON dump in `ApiError.message`.
 */
const toSubmitErrorMessage = (error: unknown): string => {
  if (error instanceof ApiError && typeof error.body === 'object' && error.body !== null) {
    const { detail, validationErrors } = error.body as ProblemDetailBody;
    const messages = readValidationMessages(validationErrors);
    if (typeof detail === 'string' && detail.trim().length > 0) {
      return messages.length > 0 ? `${detail}: ${messages.join('; ')}` : detail;
    }
    if (messages.length > 0) {
      return messages.join('; ');
    }
  }
  return error instanceof Error ? error.message : 'Formula set creation failed.';
};

/** Seeds every catalog key for an area with the baseline expression. */
const buildInitialFormulas = (
  area: keyof typeof FORMULA_KEYS,
): Record<string, FormulaDraftValue> => {
  const obj: Record<string, FormulaDraftValue> = {};
  for (const k of getFormulaKeysForArea(area)) {
    obj[k.key] = { expression: '1', validationErrors: [] };
  }
  return obj;
};

/** Content equality for validation errors — the engine rebuilds arrays on each run. */
const sameValidationErrors = (
  a: readonly FormulaValidationError[],
  b: readonly FormulaValidationError[],
): boolean =>
  a.length === b.length &&
  a.every((error, idx) => error.code === b[idx]?.code && error.message === b[idx]?.message);

const FormulaConfigurationCreateForm: FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateFormulaSet();

  const defaultArea = 'INTERIOR' as const;
  const defaultStartDate = DateTime.now().plus({ days: 1 }).toFormat(DATE_FORMAT);

  const [isReviewing, setIsReviewing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const editedKeysByArea = useRef<Record<string, Set<string>>>({});
  const formulasByArea = useRef<Record<string, Record<string, FormulaDraftValue>>>({});

  const form = useForm({
    defaultValues: {
      area: defaultArea,
      startDate: defaultStartDate,
      formulas: buildInitialFormulas(defaultArea),
    },
    onSubmit: async ({ value }) => {
      const dto: FormulaSetRequest = {
        area: value.area,
        startDate: value.startDate,
        endDate: null,
        formulas: Object.keys(value.formulas).map((formulaKey, idx) => ({
          formulaKey,
          expression: value.formulas[formulaKey]?.expression ?? '',
          declaredVariables: [],
          validationErrors: [],
          sortOrder: idx,
        })),
      };
      try {
        const created = await createMutation.mutateAsync(dto);
        navigate({ to: `/configuration/formulas/${created.id}` });
      } catch (error) {
        setSubmitError(toSubmitErrorMessage(error));
      }
    },
  });

  // `useForm` does not subscribe the owning component to the form store, so a
  // value written by setFieldValue only becomes visible on the next unrelated
  // re-render — which left canReview trusting a stale start date, left the
  // formula sections showing the previous area after a radio toggle, and left
  // isEmpty/hasErrors (and every onFormulaChange merge) reading formulas written
  // by earlier renders: carried-forward values never appeared and the Review
  // button could never enable. Subscribe to each field instead of the whole
  // values object, which would re-enter validation on every edit.
  const startDate = useSelector(form.store, (state) => state.values.startDate);
  const area = useSelector(form.store, (state) => state.values.area);
  const formulasState = useSelector(form.store, (state) => state.values.formulas);
  const { data: variablesData } = useFormulaVariables({
    date: startDate,
    area,
    districtCode: FORMULA_VARIABLES_DISTRICT_CODE,
  });
  const {
    data: currentFormulaSet,
    isError: isCurrentFormulaSetError,
    isFetched: isCurrentFormulaSetFetched,
    error: currentFormulaSetError,
  } = useCurrentOpenEndedFormulaSet({ area });

  const formulaGroups = useMemo(() => FORMULA_KEYS[area as keyof typeof FORMULA_KEYS], [area]);

  const allKeys = useMemo(() => getFormulaKeysForArea(area), [area]);

  const prefetchedContexts = useRef(new Set<string>());

  useEffect(() => {
    if (!isCurrentFormulaSetFetched) {
      return;
    }

    const source = currentFormulaSet?.area === area ? currentFormulaSet : undefined;
    const sourceIdentity = source?.id ?? 'none';
    const contextIdentity = `${area}:${sourceIdentity}`;
    if (prefetchedContexts.current.has(contextIdentity)) {
      return;
    }
    prefetchedContexts.current.add(contextIdentity);

    const keys = [
      ...new Set([
        ...allKeys.map((formulaKey) => formulaKey.key),
        ...(source?.formulas ?? []).map((formula) => formula.formulaKey),
      ]),
    ];
    const carriedForward = carryForwardFormulaValues(
      formulasState,
      keys,
      source?.formulas ?? [],
      editedKeysByArea.current[area] ?? new Set(),
    );
    for (const key of keys) {
      carriedForward[key] ??= { expression: '1', validationErrors: [] };
    }
    const hasChanges = keys.some(
      (key) => carriedForward[key]?.expression !== formulasState[key]?.expression,
    );

    if (hasChanges) {
      form.setFieldValue('formulas', carriedForward);
    }
  }, [allKeys, area, currentFormulaSet, form, formulasState, isCurrentFormulaSetFetched]);

  const isEmpty = useMemo(() => {
    return allKeys.some((k) => !formulasState[k.key]?.expression?.trim());
  }, [allKeys, formulasState]);

  const hasErrors = useMemo(() => {
    return allKeys.some((k) => (formulasState[k.key]?.validationErrors?.length ?? 0) > 0);
  }, [allKeys, formulasState]);

  // The form is submitted with noValidate (Carbon's DatePickerInput pattern blocks
  // native submission), so the date must be gated here: both date handlers clear
  // invalid/past input to '', but nothing previously stopped review + submit with
  // an empty start date.
  const hasValidStartDate = useMemo(() => {
    if (!startDate.trim()) {
      return false;
    }
    const parsed = DateTime.fromFormat(startDate, DATE_FORMAT);
    return parsed.isValid && parsed >= DateTime.now().plus({ days: 1 }).startOf('day');
  }, [startDate]);

  const canReview =
    !isEmpty &&
    !hasErrors &&
    hasValidStartDate &&
    isCurrentFormulaSetFetched &&
    !createMutation.isPending;

  const handleBack = () => {
    if (isReviewing) {
      setIsReviewing(false);
      return;
    }
    // @ts-expect-error TanStack Router cannot infer this dynamically selected route.
    navigate({ to: '/configuration/formulas' });
  };

  const handleReview = () => {
    if (isReviewing) {
      void form.handleSubmit();
      return;
    }
    if (!canReview) {
      return;
    }
    setIsReviewing(true);
  };

  const onFormulaChange = (
    key: string,
    expression: string,
    validationErrors: FormulaValidationError[] = [],
  ) => {
    const current = formulasState[key];
    const isContentChange = current?.expression !== expression;
    // Only a real content change marks the key as edited. Validation echoes
    // (FormulaInput reports its result on mount and on every evaluation) reuse
    // the stored expression — treating those as edits would mark every key
    // before carry-forward runs, and carry-forward keeps edited keys as-is,
    // so the loaded set would never appear.
    if (isContentChange) {
      const areaKeys = editedKeysByArea.current[area] ?? new Set<string>();
      editedKeysByArea.current[area] = new Set(areaKeys).add(key);
    }
    setSubmitError(null);
    // A no-op change (e.g. an engine echo of the value already in the store)
    // must not replace the record — a new object reference would re-render the
    // sections for nothing.
    if (
      current &&
      !isContentChange &&
      sameValidationErrors(current.validationErrors ?? [], validationErrors)
    ) {
      return;
    }
    form.setFieldValue('formulas', {
      ...formulasState,
      [key]: { expression, validationErrors },
    });
  };

  const formulas: FormulaItemDto[] = useMemo(() => {
    return allKeys.map((k, idx) => ({
      formulaKey: k.key,
      expression: formulasState[k.key]?.expression ?? '',
      declaredVariables: [],
      validationErrors: formulasState[k.key]?.validationErrors ?? [],
      sortOrder: idx + 1,
    }));
  }, [allKeys, formulasState]);

  const handleAreaChange = (selected?: string | number) => {
    // Narrow to the radio's values: the form field is typed from defaultValues
    // and the callback gives back a bare string.
    if (selected === 'INTERIOR' || selected === 'COASTAL') {
      formulasByArea.current[area] = formulasState;
      // @ts-expect-error TanStack Form does not narrow the radio callback value.
      form.setFieldValue('area', selected);
      // Seed from the area's own catalog: defaultValues only ever contain the
      // default area's keys, so a first switch must not carry them over.
      form.setFieldValue(
        'formulas',
        formulasByArea.current[selected] ?? buildInitialFormulas(selected),
      );
      setIsReviewing(false);
    }
  };

  const handleDateChange = (dates: Date[]) => {
    if (!dates[0]) {
      form.setFieldValue('startDate', '');
      return;
    }
    const selected = DateTime.fromJSDate(dates[0]);
    if (
      selected.isValid &&
      selected.startOf('day') >= DateTime.now().plus({ days: 1 }).startOf('day')
    ) {
      const formatted = selected.toFormat(DATE_FORMAT);
      form.setFieldValue('startDate', formatted);
    } else {
      form.setFieldValue('startDate', '');
    }
  };

  const handleDateInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.currentTarget.value.trim().replaceAll('/', '-');
    const parsed = DateTime.fromFormat(value, DATE_FORMAT);
    if (!value || !parsed.isValid || parsed < DateTime.now().plus({ days: 1 }).startOf('day')) {
      form.setFieldValue('startDate', '');
      return;
    }
    form.setFieldValue('startDate', parsed.toFormat(DATE_FORMAT));
  };

  const datePickerValue = startDate
    ? DateTime.fromFormat(startDate, DATE_FORMAT).toJSDate()
    : undefined;

  return (
    <Column
      max={16}
      xlg={16}
      lg={16}
      md={8}
      sm={4}
      className="formula-config-create-column__content"
    >
      <form
        data-testid="formula-config-create-form"
        // Carbon's DatePickerInput injects a default pattern (d/M/yyyy) that the
        // yyyy/mm/dd value format can never satisfy, which would silently block
        // native form submission. Validation is handled by the form state below
        // (isEmpty/hasErrors plus handleDateInputChange), so skip native checks.
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          handleReview();
        }}
      >
        <Grid>
          {!isReviewing && (
            <>
              <Column max={16} xlg={16} lg={16} md={8} sm={4}>
                <RadioButtonGroup
                  name="area"
                  legendText="Area"
                  valueSelected={area}
                  onChange={handleAreaChange}
                >
                  <RadioButton labelText="Interior" value="INTERIOR" id="area-interior" />
                  <RadioButton labelText="Coast" value="COASTAL" id="area-coast" />
                </RadioButtonGroup>
              </Column>
              <Column max={4} xlg={4} lg={4} md={4} sm={4}>
                <DatePicker
                  datePickerType="single"
                  dateFormat="Y/m/d"
                  allowInput
                  minDate={DateTime.now().plus({ days: 1 }).toFormat(DATE_FORMAT)}
                  value={datePickerValue ? [datePickerValue] : []}
                  onChange={handleDateChange}
                >
                  <DatePickerInput
                    id="start-date-picker"
                    data-testid="start-date-picker"
                    labelText="Start date"
                    placeholder="yyyy/mm/dd"
                    onChange={handleDateInputChange}
                  />
                </DatePicker>
              </Column>
              <Column
                max={12}
                xlg={12}
                lg={12}
                md={4}
                sm={4}
                className="formula-variable-catalog-trigger"
              >
                {variablesData?.catalog && (
                  <FormulaVariableCatalog catalog={variablesData.catalog} />
                )}
              </Column>
            </>
          )}
          <Column max={16} xlg={16} lg={16} md={8} sm={4}>
            {isCurrentFormulaSetError &&
              (currentFormulaSetError instanceof ApiError
                ? currentFormulaSetError.status !== 404
                : true) && (
                <p role="alert" className="formula-config-create-validation">
                  The current formula set could not be loaded. Review the default values before
                  continuing.
                </p>
              )}
            {submitError && (
              <p role="alert" className="formula-config-create-validation">
                {submitError}
              </p>
            )}
            <div className="formula-sections">
              {Object.entries(formulaGroups).map(([sectionName, keys]) => (
                <FormulaSection
                  key={sectionName}
                  sectionName={sectionName}
                  keys={keys}
                  area={area}
                  date={startDate}
                  formulas={formulas}
                  isEditable={!isReviewing}
                  onChange={onFormulaChange}
                />
              ))}
            </div>
            {!isReviewing && (isEmpty || hasErrors || !hasValidStartDate) && (
              <div className="formula-config-create-validation">
                {isEmpty && <p>All formulas must be filled before reviewing.</p>}
                {hasErrors && <p>Fix formula validation errors before reviewing.</p>}
                {!hasValidStartDate && (
                  <p>Select a start date of tomorrow or later before reviewing.</p>
                )}
              </div>
            )}
          </Column>
        </Grid>
        <div className="formula-config-create-actions">
          <Button kind="secondary" type="button" onClick={handleBack}>
            {isReviewing ? 'Back to edit' : 'Cancel'}
          </Button>
          <Button kind="primary" type="submit" disabled={!canReview && !isReviewing}>
            {isReviewing ? 'Create formula set' : 'Review formulas'}
          </Button>
        </div>
      </form>
    </Column>
  );
};

export default FormulaConfigurationCreateForm;
