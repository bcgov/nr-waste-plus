import { Column } from '@carbon/react';
import type { FC } from 'react';

import type { FormulaSetResponse } from '@/services/formulaConfiguration.types';

interface FormulaConfigurationDetailViewProps {
  data: FormulaSetResponse;
}

const FormulaConfigurationDetailView: FC<FormulaConfigurationDetailViewProps> = ({ data }) => (
  <Column lg={16} md={8} sm={4}>
    <pre>{JSON.stringify(data, null, 2)}</pre>
  </Column>
);

export default FormulaConfigurationDetailView;
