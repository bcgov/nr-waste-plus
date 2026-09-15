import { type FC, useMemo, useRef } from 'react';

import type { FormulaError } from '@/components/Form/FormulaInput/types';
import type { FormulaKeyDefinition } from '@/services/formulaConfiguration.constants';
import type { FormulaItemDto } from '@/services/formulaConfiguration.types';
import type { FormulaValidationError } from '@/services/formulaConfiguration.types';

import FormulaInput from '@/components/Form/FormulaInput';
import ReadonlyInput from '@/components/Form/ReadonlyInput';
import { useFormulaVariables } from '@/hooks/useFormulaConfiguration';

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

  // Fetch variables from backend API
  const { data: variablesData } = useFormulaVariables({ date, area });

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
          {formula?.validationErrors.map((error) => (
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
            onChange(value, formula?.validationErrors ?? []);
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
