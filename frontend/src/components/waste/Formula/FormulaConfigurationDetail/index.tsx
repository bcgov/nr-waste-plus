import { Column } from '@carbon/react';
import { type FC } from 'react';

import FormulaConfigurationDetailHeader from './FormulaConfigurationDetailHeader.tsx';

import type { FormulaSetResponse } from '@/services/formulaConfiguration.types.ts';

import FormulaSection from '@/components/waste/Formula/FormulaSection/index.tsx';
import {
  FORMULA_KEYS,
  getFormulaLabel,
  type FormulaKeyDefinition,
} from '@/services/formulaConfiguration.constants.ts';

interface FormulaConfigurationDetailProps {
  data: FormulaSetResponse;
}

const FormulaConfigurationDetail: FC<FormulaConfigurationDetailProps> = ({ data }) => {
  const configuredKeys = new Set(
    Object.values(FORMULA_KEYS[data.area])
      .flat()
      .map(({ key }) => key),
  );
  const additionalKeys: FormulaKeyDefinition[] = data.formulas
    .filter(({ formulaKey }) => !configuredKeys.has(formulaKey))
    .map(({ formulaKey }) => ({ key: formulaKey, label: getFormulaLabel(data.area, formulaKey) }));
  const sections = [
    ...Object.entries(FORMULA_KEYS[data.area]),
    ...(additionalKeys.length > 0 ? [['Additional Formulas', additionalKeys] as const] : []),
  ];

  return (
    <>
      <FormulaConfigurationDetailHeader startDate={data.startDate} endDate={data.endDate} />
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

export default FormulaConfigurationDetail;
