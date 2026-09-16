import { Column, SkeletonText } from '@carbon/react';

const FormulaConfigurationDetailSkeleton = () => {
  return (
    <>
      <Column lg={4} md={4} sm={4} className="district-volume-detail__start-date">
        <SkeletonText heading width="120px" />
        <SkeletonText width="80px" />
      </Column>
      <Column lg={12} md={4} sm={4} className="district-volume-detail__end-date">
        <SkeletonText heading width="120px" />
        <SkeletonText width="80px" />
      </Column>
      <Column lg={16} md={8} sm={4}>
        <SkeletonText heading width="200px" />
        <SkeletonText width="100%" />
        <SkeletonText width="100%" />
        <SkeletonText width="100%" />
      </Column>
    </>
  );
};

export default FormulaConfigurationDetailSkeleton;
