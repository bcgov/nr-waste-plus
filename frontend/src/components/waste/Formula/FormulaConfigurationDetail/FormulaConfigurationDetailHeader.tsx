import { Column } from '@carbon/react';
import { type FC } from 'react';

import DateTag from '@/components/core/Tags/DateTag';
import ReadonlyInput from '@/components/Form/ReadonlyInput';

interface FormulaConfigurationDetailHeaderProps {
  startDate: string;
  endDate: string | null;
}

const FormulaConfigurationDetailHeader: FC<FormulaConfigurationDetailHeaderProps> = ({
  startDate,
  endDate,
}) => {
  return (
    <>
      <Column lg={4} md={4} sm={4} className="formula-set-detail__start-date">
        <ReadonlyInput label="Start date">
          {startDate && <DateTag date={startDate} format="MMMM dd, yyyy" />}
        </ReadonlyInput>
      </Column>
      <Column lg={12} md={4} sm={4} className="formula-set-detail__end-date">
        <ReadonlyInput label="End date">
          {endDate ? <DateTag date={endDate} format="MMMM dd, yyyy" /> : <span>Open-ended</span>}
        </ReadonlyInput>
      </Column>
    </>
  );
};

export default FormulaConfigurationDetailHeader;
