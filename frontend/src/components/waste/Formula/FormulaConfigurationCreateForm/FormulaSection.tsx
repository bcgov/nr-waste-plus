import { type FC } from 'react';

import FormulaRow from './FormulaRow.tsx';

import type { FormulaKeyDefinition } from '@/services/formulaConfiguration.constants.ts';
import type { FormulaItemDto, FormulaValidationError } from '@/services/formulaConfiguration.types.ts';

interface FormulaSectionProps {
  sectionName: string;
  keys: readonly FormulaKeyDefinition[];
  area: 'INTERIOR' | 'COASTAL';
  date: string; // YYYY-MM-DD
  formulas: FormulaItemDto[];
  isEditable: boolean;
  onChange: (
    formulaKey: string,
    expression: string,
    validationErrors: FormulaValidationError[],
  ) => void;
}

const FormulaSection: FC<FormulaSectionProps> = ({
  sectionName,
  keys,
  area,
  date,
  formulas,
  isEditable,
  onChange,
}) => {
  return (
    <div className="formula-section">
      <div className="formula-section__header">
        <h3 className="formula-section__title">{sectionName}</h3>
        <span className="formula-section__count">
          {keys.length} formula{keys.length !== 1 ? 's' : ''}
        </span>
      </div>
      {keys.map((keyDef) => {
        const formula = formulas.find((f) => f.formulaKey === keyDef.key);
        return (
          <FormulaRow
            key={keyDef.key}
            area={area}
            date={date}
            keyDef={keyDef}
            formula={formula}
            isEditable={isEditable}
            onChange={(expression, validationErrors) =>
              onChange(keyDef.key, expression, validationErrors)
            }
          />
        );
      })}
    </div>
  );
};

export default FormulaSection;
