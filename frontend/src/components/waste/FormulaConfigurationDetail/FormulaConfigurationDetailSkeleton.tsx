import { Column, SkeletonText } from '@carbon/react';
import type { FC } from 'react';

const FormulaConfigurationDetailSkeleton: FC = () => (
  <>
    <Column lg={16} md={8} sm={4}>
      <SkeletonText heading width="30%" />
      <SkeletonText width="60%" />
    </Column>
  </>
);

export default FormulaConfigurationDetailSkeleton;
