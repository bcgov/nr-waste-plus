import { Column } from '@carbon/react';
import { type FC } from 'react';

import type { FormulaSetResponse } from '@/services/formulaConfiguration.types';
import { FORMULA_KEYS } from '@/services/formulaConfiguration.constants';

import FormulaConfigurationDetailHeader from './FormulaConfigurationDetailHeader';
import FormulaSection from '@/components/waste/FormulaConfigurationCreateForm/FormulaSection';

interface FormulaConfigurationDetailViewProps {
  data: FormulaSetResponse;
}

const FormulaConfigurationDetailView: FC<FormulaConfigurationDetailViewProps> = ({ data }) => {
  const sections = Object.entries(FORMULA_KEYS[data.area]);

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
