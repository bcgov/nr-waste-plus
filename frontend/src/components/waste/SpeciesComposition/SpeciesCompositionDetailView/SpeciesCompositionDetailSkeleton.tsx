import { Column, SkeletonText } from '@carbon/react';
import { type FC } from 'react';

/**
 * Skeleton placeholder for the Species Composition Detail page while data is loading.
 *
 * Mirrors the layout of the full detail page: banner area with skeleton text,
 * notification area, then a matrix skeleton.
 *
 * @returns The skeleton component.
 */
const SpeciesCompositionDetailSkeleton: FC = () => (
  <>
    <Column
      lg={16}
      md={8}
      sm={4}
      className="species-composition-detail-column__banner"
      data-testid="species-composition-detail-skeleton"
    >
      <SkeletonText heading width="300px" />
      <SkeletonText width="200px" />
    </Column>
    <Column lg={16} md={8} sm={4}>
      <SkeletonText heading width="120px" />
      <SkeletonText width="80px" />
      <SkeletonText heading width="120px" />
      <SkeletonText width="80px" />
      <SkeletonText heading width="120px" />
      <SkeletonText width="80px" />
      <SkeletonText heading width="120px" />
      <SkeletonText width="80px" />
      <SkeletonText heading width="160px" />
      <SkeletonText width="100%" />
      <SkeletonText width="100%" />
      <SkeletonText width="100%" />
    </Column>
  </>
);

export default SpeciesCompositionDetailSkeleton;
