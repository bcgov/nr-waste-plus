import { Column } from '@carbon/react';
import { type FC } from 'react';

import DateTag from '@/components/core/Tags/DateTag';
import ReadonlyInput from '@/components/Form/ReadonlyInput';

interface FormulaConfigurationDetailHeaderProps {
  area: 'INTERIOR' | 'COASTAL';
  startDate: string;
  endDate: string | null;
}

const FormulaConfigurationDetailHeader: FC<FormulaConfigurationDetailHeaderProps> = ({
  area,
  startDate,
  endDate,
}) => {
  return (
    <Column lg={16} md={8} sm={4} className="detail-header">
      <div className="detail-header__meta">
        <ReadonlyInput label="Area">{area === 'INTERIOR' ? 'Interior' : 'Coastal'}</ReadonlyInput>
        <ReadonlyInput label="Start date">
          {startDate && <DateTag date={startDate} format="MMMM dd, yyyy" />}
        </ReadonlyInput>
        <ReadonlyInput label="End date">
          {endDate ? <DateTag date={endDate} format="MMMM dd, yyyy" /> : 'Open-ended'}
        </ReadonlyInput>
      </div>
    </Column>
  );
};

export default FormulaConfigurationDetailHeader;
