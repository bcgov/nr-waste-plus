import { type FC, useMemo, useRef } from 'react';

import type { FormulaError } from '@/components/Form/FormulaInput/types.ts';
import type { FormulaKeyDefinition } from '@/services/formulaConfiguration.constants.ts';
import type {
  FormulaItemDto,
  FormulaValidationError,
} from '@/services/formulaConfiguration.types.ts';

import FormulaInput from '@/components/Form/FormulaInput';
import ReadonlyInput from '@/components/Form/ReadonlyInput';
import { useFormulaVariables } from '@/hooks/useFormulaConfiguration';
import { FORMULA_VARIABLES_DISTRICT_CODE } from '@/services/formulaConfiguration.constants.ts';

interface FormulaRowProps {
  area: 'INTERIOR' | 'COASTAL';
  date: string; // YYYY-MM-DD
  keyDef: FormulaKeyDefinition;
  formula: FormulaItemDto | undefined;
  isEditable: boolean;
  onChange: (expression: string, validationErrors: FormulaValidationError[]) => void;
}

const FormulaRow: FC<FormulaRowProps> = ({ area, date, keyDef, formula, isEditable, onChange }) => {
  const expression = formula?.expression ?? '';
  const expressionRef = useRef(expression);
  // Optional on FormulaItemDto — the backend contract omits it.
  const validationErrors = formula?.validationErrors ?? [];

  // Fetch variables from backend API — only editable rows render the editor
  // that consumes them, so read-only rows and review mode skip the request
  // (it 404s for historical date ranges).
  const { data: variablesData } = useFormulaVariables(
    {
      date,
      area,
      districtCode: FORMULA_VARIABLES_DISTRICT_CODE,
    },
    isEditable,
  );

  // Use the flat map from the API response as dynamicParams
  const dynamicParams = useMemo(() => {
    return variablesData?.flat ?? {};
  }, [variablesData]);

  if (!isEditable) {
    return (
      <div className="formula-row">
        <div className="formula-row__info">
          <span className="formula-row__label">{keyDef.label}</span>
        </div>
        <div className="formula-row__expression">
          <ReadonlyInput label="Expression">
            {expression || <span className="formula-row__expression-empty">Not configured</span>}
          </ReadonlyInput>
          {validationErrors.map((error) => (
            <div key={`${error.code}-${error.startOffset ?? 0}`} role="alert">
              <strong>{error.code}</strong>: {error.message}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="formula-row">
      <div className="formula-row__info">
        <span className="formula-row__label">{keyDef.label}</span>
      </div>
      <div className="formula-row__expression">
        <FormulaInput
          initialFormula={expression}
          onChange={(value) => {
            expressionRef.current = value;
            onChange(value, validationErrors);
          }}
          onValidationError={(error: FormulaError | null) =>
            onChange(
              expressionRef.current,
              error ? [{ code: 'FORMULA_ERROR', message: error.message }] : [],
            )
          }
          readOnly={false}
          displayResult={true}
          displayDependencyGraph={false}
          ariaLabel={`${keyDef.label} (${keyDef.key})`}
          fixedParams={{}}
          dynamicParams={dynamicParams}
        />
      </div>
    </div>
  );
};

export default FormulaRow;
