import { Column, SkeletonText } from '@carbon/react';

const FormulaConfigurationDetailSkeleton = () => {
  return (
    <>
      <Column lg={16} md={8} sm={4} className="detail-header">
        <div className="detail-header__meta">
          <div>
            <SkeletonText heading width="120px" />
            <SkeletonText width="80px" />
          </div>
          <div>
            <SkeletonText heading width="120px" />
            <SkeletonText width="80px" />
          </div>
          <div>
            <SkeletonText heading width="120px" />
            <SkeletonText width="80px" />
          </div>
        </div>
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
