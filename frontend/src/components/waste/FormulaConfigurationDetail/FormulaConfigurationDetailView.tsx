import { Column } from '@carbon/react';
import { type FC } from 'react';

import { FORMULA_KEYS, getFormulaLabel } from '@/services/formulaConfiguration.constants';
import type { FormulaSetResponse } from '@/services/formulaConfiguration.types';

import FormulaConfigurationDetailHeader from './FormulaConfigurationDetailHeader';
import FormulaSection from '@/components/waste/FormulaConfigurationCreateForm/FormulaSection';

interface FormulaConfigurationDetailViewProps {
  data: FormulaSetResponse;
}

const FormulaConfigurationDetailView: FC<FormulaConfigurationDetailViewProps> = ({ data }) => {
  const knownKeys = Object.values(FORMULA_KEYS[data.area]).flat();
  const knownKeySet = new Set(knownKeys.map(({ key }) => key));
  const sections = Object.entries(FORMULA_KEYS[data.area])
    .map(([sectionName, keys]) => [
      sectionName,
      keys.filter((keyDef) => data.formulas.some(({ formulaKey }) => formulaKey === keyDef.key)),
    ] as const)
    .filter(([, keys]) => keys.length > 0);
  const additionalKeys = data.formulas
    .filter(({ formulaKey }) => !knownKeySet.has(formulaKey))
    .map(({ formulaKey }) => ({ key: formulaKey, label: getFormulaLabel(data.area, formulaKey) }));

  if (additionalKeys.length > 0) {
    sections.push(['Additional Formulas', additionalKeys]);
  }

  return (
    <>
      <FormulaConfigurationDetailHeader
        area={data.area}
        startDate={data.startDate}
        endDate={data.endDate}
      />
      <Column lg={16} md={8} sm={4} className="formula-config-sections">
        <div className="formula-sections">
          {sections.map(([sectionName, keys]) => (
            <FormulaSection
              key={sectionName}
              sectionName={sectionName}
              keys={keys}
              area={data.area}
              date={data.startDate}
              formulas={data.formulas}
              isEditable={false}
              onChange={() => {}}
            />
          ))}
        </div>
      </Column>
    </>
  );
};

export default FormulaConfigurationDetailView;
