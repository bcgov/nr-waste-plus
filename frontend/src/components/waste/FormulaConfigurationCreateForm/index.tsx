import {
  Button,
  Column,
  Grid,
  RadioButtonGroup,
  RadioButton,
  DatePicker,
  DatePickerInput,
} from '@carbon/react';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { DateTime } from 'luxon';
import { type FC, useEffect, useMemo, useRef, useState } from 'react';

import FormulaVariableCatalog from '../FormulaVariableCatalog';

import { carryForwardFormulaValues } from './carryForward';
import FormulaSection from './FormulaSection';

import type {
  FormulaItemDto,
  FormulaSetRequest,
  FormulaValidationError,
} from '@/services/formulaConfiguration.types';

import {
  useCreateFormulaSet,
  useCurrentOpenEndedFormulaSet,
  useFormulaVariables,
} from '@/hooks/useFormulaConfiguration';
import { FORMULA_KEYS, getFormulaKeysForArea } from '@/services/formulaConfiguration.constants';

import './index.scss';

const DATE_FORMAT = 'yyyy-MM-dd' as const;

const FormulaConfigurationCreateForm: FC = () => {
  const navigate = useNavigate();
  const createMutation = useCreateFormulaSet();

  const defaultArea = 'INTERIOR' as const;
  const defaultStartDate = DateTime.now().plus({ days: 1 }).toFormat(DATE_FORMAT);

  const [isReviewing, setIsReviewing] = useState(false);
  const [editedKeys, setEditedKeys] = useState<Set<string>>(() => new Set());

  const initialFormulas = useMemo(() => {
    const keys = getFormulaKeysForArea(defaultArea);
    const obj: Record<string, { expression: string; validationErrors: FormulaValidationError[] }> =
      {};
    for (const k of keys) {
      obj[k.key] = { expression: '1', validationErrors: [] };
    }
    return obj;
  }, []);

  const form = useForm({
    defaultValues: {
      area: defaultArea,
      startDate: defaultStartDate,
      formulas: initialFormulas,
    },
    onSubmit: async ({ value }) => {
      const dto: FormulaSetRequest = {
        area: value.area,
        startDate: value.startDate,
        endDate: null,
        formulas: allKeys.map((k, idx) => ({
          formulaKey: k.key,
          expression: value.formulas[k.key]?.expression ?? '',
          declaredVariables: [],
          validationErrors: [],
          sortOrder: idx,
        })),
      };
      const created = await createMutation.mutateAsync(dto);
      navigate({ to: `/configuration/formulas/${created.id}` });
    },
  });

  const area = form.state.values.area;
  const startDate = form.state.values.startDate;
  const formulasState = form.state.values.formulas;
  const { data: variablesData } = useFormulaVariables({
    date: startDate,
    area,
  });
  const {
    data: currentFormulaSet,
    isError: isCurrentFormulaSetError,
    isFetched: isCurrentFormulaSetFetched,
  } = useCurrentOpenEndedFormulaSet({ area });

  const formulaGroups = useMemo(() => FORMULA_KEYS[area as keyof typeof FORMULA_KEYS], [area]);

  const allKeys = getFormulaKeysForArea(area);

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

    const keys = allKeys.map((formulaKey) => formulaKey.key);
    const carriedForward = carryForwardFormulaValues(
      formulasState,
      keys,
      source?.formulas ?? [],
      editedKeys,
    );
    const hasChanges = keys.some(
      (key) => carriedForward[key]?.expression !== formulasState[key]?.expression,
    );

    if (hasChanges) {
      form.setFieldValue('formulas', carriedForward);
    }
  }, [
    allKeys,
    area,
    currentFormulaSet,
    editedKeys,
    form,
    formulasState,
    isCurrentFormulaSetFetched,
  ]);

  useEffect(() => {
    const missingKeys = allKeys.filter((key) => formulasState[key.key] === undefined);
    if (missingKeys.length === 0) {
      return;
    }

    form.setFieldValue('formulas', {
      ...formulasState,
      ...Object.fromEntries(
        missingKeys.map((key) => [key.key, { expression: '1', validationErrors: [] }]),
      ),
    });
  }, [allKeys, form, formulasState]);

  const isEmpty = useMemo(() => {
    return allKeys.some((k) => !formulasState[k.key]?.expression?.trim());
  }, [allKeys, formulasState]);

  const hasErrors = useMemo(() => {
    return allKeys.some((k) => (formulasState[k.key]?.validationErrors?.length ?? 0) > 0);
  }, [allKeys, formulasState]);

  const canReview = !isEmpty && !hasErrors;

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
      form.handleSubmit();
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
    setEditedKeys((previous) => new Set(previous).add(key));
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
    if (typeof selected === 'string') {
      // @ts-expect-error TanStack Form does not narrow the radio callback value.
      form.setFieldValue('area', selected);
    }
  };

  const handleDateChange = (dates: Date[]) => {
    if (dates[0]) {
      const formatted = DateTime.fromJSDate(dates[0]).toFormat(DATE_FORMAT);
      form.setFieldValue('startDate', formatted);
    }
  };

  return (
    <Column
      max={16}
      xlg={16}
      lg={16}
      md={8}
      sm={4}
      className="formula-config-create-column__content"
    >
      <form data-testid="formula-config-create-form">
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
              <Column max={16} xlg={16} lg={16} md={8} sm={4}>
                <DatePicker
                  datePickerType="single"
                  dateFormat="Y/m/d"
                  allowInput
                  minDate={DateTime.now().plus({ days: 1 }).toFormat(DATE_FORMAT)}
                  value={[DateTime.fromFormat(startDate, DATE_FORMAT).toJSDate()]}
                  onChange={handleDateChange}
                >
                  <DatePickerInput
                    id="start-date-picker"
                    data-testid="start-date-picker"
                    labelText="Start date"
                    placeholder="yyyy/mm/dd"
                  />
                </DatePicker>
              </Column>
            </>
          )}
          <Column max={16} xlg={16} lg={16} md={8} sm={4}>
            {variablesData?.catalog && (
              <div className="formula-variable-catalog-trigger">
                <FormulaVariableCatalog catalog={variablesData.catalog} />
              </div>
            )}
            {isCurrentFormulaSetError && (
              <p role="alert" className="formula-config-create-validation">
                The current formula set could not be loaded. Review the default values before
                continuing.
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
            {!isReviewing && (isEmpty || hasErrors) && (
              <div className="formula-config-create-validation">
                {isEmpty && <p>All formulas must be filled before reviewing.</p>}
                {hasErrors && <p>Fix formula validation errors before reviewing.</p>}
              </div>
            )}
          </Column>
        </Grid>
        <div className="formula-config-create-actions">
          <Button kind="secondary" onClick={handleBack}>
            {isReviewing ? 'Back to edit' : 'Cancel'}
          </Button>
          <Button kind="primary" onClick={handleReview} disabled={!canReview && !isReviewing}>
            {isReviewing ? 'Create formula set' : 'Review formulas'}
          </Button>
        </div>
      </form>
    </Column>
  );
};

export default FormulaConfigurationCreateForm;
